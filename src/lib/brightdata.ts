/**
 * Bright Data Instagram Scraper — thin client + Zod-based normalizer.
 *
 * This module never makes a live call on its own; callers are responsible for
 * gating real requests behind explicit env checks (see api/collect/route.ts).
 * Tests must mock `global.fetch`; no real requests are allowed (CLAUDE.md).
 */

import { z } from "zod";

import type { MediaType, Post } from "@/types/post";

const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com/datasets/v3/trigger";
const BRIGHT_DATA_PROGRESS_URL = "https://api.brightdata.com/datasets/v3/progress";
const BRIGHT_DATA_SNAPSHOT_URL = "https://api.brightdata.com/datasets/v3/snapshot";

export class BrightDataError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    const detail = body ? ` — ${body.slice(0, 500)}` : "";
    super(message ?? `Bright Data request failed (${status})${detail}`);
    this.name = "BrightDataError";
    this.status = status;
    this.body = body;
  }
}

export interface FetchDatasetArgs {
  datasetId: string;
  payload: unknown;
  /**
   * Extra query params appended to the trigger URL. Used for discovery
   * phases, e.g. `{ type: "discover_new", discover_by: "hashtag" }`.
   */
  queryParams?: Record<string, string>;
}

/**
 * Trigger a Bright Data dataset run and return the raw JSON response.
 * Throws {@link BrightDataError} on non-2xx responses.
 */
export async function fetchDataset({
  datasetId,
  payload,
  queryParams,
}: FetchDatasetArgs): Promise<unknown> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    throw new BrightDataError(0, "", "BRIGHT_DATA_API_KEY is not set");
  }

  const extra = queryParams
    ? Object.entries(queryParams)
        .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("")
    : "";
  const url = `${BRIGHT_DATA_BASE_URL}?dataset_id=${encodeURIComponent(datasetId)}&format=json&include_errors=true${extra}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await safeReadBody(res);
    throw new BrightDataError(res.status, body);
  }

  return (await res.json()) as unknown;
}

async function safeReadBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Detect Bright Data's async `{ snapshot_id }` response shape.
 * v3/trigger returns this; caller must poll progress then fetch snapshot.
 */
export function extractSnapshotId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as Record<string, unknown>).snapshot_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export interface PollSnapshotOptions {
  intervalMs?: number;
  maxAttempts?: number;
  apiKey?: string;
}

/**
 * Poll progress until "ready", then fetch and return the snapshot JSON.
 * Throws {@link BrightDataError} on failure / non-2xx / non-terminal exhaustion.
 */
export async function pollSnapshot(
  snapshotId: string,
  opts: PollSnapshotOptions = {},
): Promise<unknown> {
  const apiKey = opts.apiKey ?? process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    throw new BrightDataError(0, "", "BRIGHT_DATA_API_KEY is not set");
  }
  const intervalMs = opts.intervalMs ?? 5_000;
  const maxAttempts = opts.maxAttempts ?? 60;
  const auth = { Authorization: `Bearer ${apiKey}` };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `${BRIGHT_DATA_PROGRESS_URL}/${encodeURIComponent(snapshotId)}`,
      { headers: auth },
    );
    if (!res.ok) {
      const body = await safeReadBody(res);
      throw new BrightDataError(res.status, body);
    }
    const progress = (await res.json()) as { status?: string };
    if (progress.status === "ready") break;
    if (progress.status === "failed") {
      throw new BrightDataError(0, JSON.stringify(progress), "snapshot failed");
    }
    if (attempt === maxAttempts - 1) {
      throw new BrightDataError(
        0,
        JSON.stringify(progress),
        `snapshot still ${progress.status ?? "pending"} after ${maxAttempts} attempts`,
      );
    }
    await sleep(intervalMs);
  }

  const snapRes = await fetch(
    `${BRIGHT_DATA_SNAPSHOT_URL}/${encodeURIComponent(snapshotId)}?format=json`,
    { headers: auth },
  );
  if (!snapRes.ok) {
    const body = await safeReadBody(snapRes);
    throw new BrightDataError(snapRes.status, body);
  }
  return (await snapRes.json()) as unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Zod schema for a single normalized post.
 * TODO: tighten field names once we see real Bright Data payloads — current
 * shape mirrors the Post type and tolerates common aliases via parsePosts.
 */
const MediaTypeSchema = z.enum(["reel", "feed", "carousel"]);

const PostSchema = z.object({
  account: z.string().min(1),
  followers: z.number().nonnegative(),
  type: MediaTypeSchema,
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  views: z.number().nonnegative().optional(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_iso: z.string().optional(),
  source_account: z.string().optional(),
  source_hashtag: z.string().optional(),
  post_url: z.string().url(),
  thumbnail_url: z.string().url(),
  comment_texts: z.array(z.string()).optional(),
});

/**
 * Best-effort coercion from a Bright Data response to a Post[].
 * Unknown / missing-required entries are skipped (never thrown) so a single
 * bad row doesn't kill an entire batch. Returns [] for unrecognised shapes.
 */
export function parsePosts(raw: unknown): Post[] {
  const items = extractArray(raw);
  const out: Post[] = [];
  for (const item of items) {
    // "Instagram - Profiles" scraper returns profile-level entries with a
    // nested `posts: [...]` array. Flatten each post and merge parent
    // profile metadata (account, followers, profile_image) onto it.
    if (
      item &&
      typeof item === "object" &&
      Array.isArray((item as Record<string, unknown>).posts)
    ) {
      const profile = item as Record<string, unknown>;
      const profileMeta: Record<string, unknown> = {
        user_posted: profile.account ?? profile.profile_name,
        followers: profile.followers,
      };
      for (const post of profile.posts as unknown[]) {
        if (!post || typeof post !== "object") continue;
        const merged = { ...profileMeta, ...(post as Record<string, unknown>) };
        const normalized = normalizeRawPost(merged);
        if (!normalized) continue;
        const parsed = PostSchema.safeParse(normalized);
        if (parsed.success) out.push(parsed.data);
      }
      continue;
    }
    const normalized = normalizeRawPost(item);
    if (!normalized) continue;
    const parsed = PostSchema.safeParse(normalized);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const maybe = (raw as Record<string, unknown>).data;
    if (Array.isArray(maybe)) return maybe;
  }
  return [];
}

/**
 * Map common Bright Data field aliases onto our canonical Post shape.
 * TODO: revisit once the real payload is captured; keep the surface narrow.
 */
function normalizeRawPost(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  const type = coerceMediaType(r.content_type ?? r.type ?? r.product_type ?? r.media_type);
  if (!type) return null;
  const caption = (r.description ?? r.caption ?? "") as string;
  const dateRaw = r.datetime ?? r.date_posted ?? r.date ?? r.taken_at_date;
  return {
    account: r.user_posted ?? r.account ?? r.username ?? r.owner_username,
    followers: toNumber(r.followers ?? r.followers_count ?? r.owner_followers),
    type,
    likes: toNumber(r.likes ?? r.likes_count),
    comments: toNumber(r.num_comments ?? r.comments ?? r.comments_count),
    views: pickViews(r),
    caption,
    hashtags: extractHashtags(r.post_hashtags ?? r.hashtags, caption),
    date: normalizeDate(dateRaw),
    date_iso: normalizeDateIso(dateRaw),
    post_url: r.url ?? r.post_url,
    thumbnail_url: r.image_url ?? r.thumbnail ?? r.thumbnail_url ?? r.display_url,
    comment_texts: Array.isArray(r.comment_texts) ? r.comment_texts : undefined,
  };
}

function coerceMediaType(v: unknown): MediaType | null {
  if (typeof v !== "string") return null;
  const lower = v.toLowerCase();
  if (lower === "reel" || lower === "video") return "reel";
  if (lower === "feed" || lower === "photo" || lower === "image") return "feed";
  if (lower === "carousel" || lower === "sidecar") return "carousel";
  return null;
}

function pickViews(r: Record<string, unknown>): number | undefined {
  const v = r.views ?? r.video_play_count ?? r.video_view_count;
  if (v === null || v === undefined) return undefined;
  return toNumber(v);
}

function extractHashtags(raw: unknown, caption: string): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  const found = caption.match(/#\S+/g);
  return found ?? [];
}

function normalizeDate(d: unknown): string {
  if (typeof d !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function normalizeDateIso(d: unknown): string | undefined {
  if (typeof d !== "string") return undefined;
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString();
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
