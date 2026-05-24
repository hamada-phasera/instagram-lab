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

export class BrightDataError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `Bright Data request failed (${status})`);
    this.name = "BrightDataError";
    this.status = status;
    this.body = body;
  }
}

export interface FetchDatasetArgs {
  datasetId: string;
  payload: unknown;
}

/**
 * Trigger a Bright Data dataset run and return the raw JSON response.
 * Throws {@link BrightDataError} on non-2xx responses.
 */
export async function fetchDataset({
  datasetId,
  payload,
}: FetchDatasetArgs): Promise<unknown> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    throw new BrightDataError(0, "", "BRIGHT_DATA_API_KEY is not set");
  }

  const url = `${BRIGHT_DATA_BASE_URL}?dataset_id=${encodeURIComponent(datasetId)}&format=json`;
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
  const type = coerceMediaType(r.type ?? r.product_type ?? r.media_type);
  if (!type) return null;
  return {
    account: r.account ?? r.username ?? r.owner_username,
    followers: toNumber(r.followers ?? r.followers_count ?? r.owner_followers),
    type,
    likes: toNumber(r.likes ?? r.likes_count),
    comments: toNumber(r.comments ?? r.comments_count),
    views: r.views !== undefined ? toNumber(r.views) : undefined,
    caption: r.caption ?? r.description ?? "",
    hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
    date: typeof r.date === "string" ? r.date : (r.taken_at_date ?? ""),
    post_url: r.post_url ?? r.url,
    thumbnail_url: r.thumbnail_url ?? r.display_url,
    comment_texts: Array.isArray(r.comment_texts) ? r.comment_texts : undefined,
  };
}

function coerceMediaType(v: unknown): MediaType | null {
  if (v === "reel" || v === "feed" || v === "carousel") return v;
  if (v === "Reel" || v === "video") return "reel";
  if (v === "Image" || v === "image") return "feed";
  if (v === "Sidecar" || v === "sidecar") return "carousel";
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
