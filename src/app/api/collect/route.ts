/**
 * /api/collect — Bright Data integration.
 *
 * POST: trigger fetch, normalize via parsePosts, persist via storage layer.
 *   Body: { type: "posts" | "reels" | "comments" | "hashtag", target: string }
 *   503 when env missing (test/no-key envs never hit the post-paid API).
 * GET:  list previously persisted files (Vercel Blob in prod, local FS in dev).
 *
 * Storage is delegated to `src/lib/storage.ts` which picks Vercel Blob when
 * `BLOB_READ_WRITE_TOKEN` is set, otherwise falls back to local `data/*.json`.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BrightDataError,
  extractSnapshotId,
  fetchDataset,
  parsePosts,
  pollSnapshot,
} from "@/lib/brightdata";
import { listCollected, persistJson, type StoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const CollectKindSchema = z.enum(["posts", "reels", "comments", "hashtag"]);
const RequestSchema = z.object({
  type: CollectKindSchema,
  target: z.string().min(1),
  /** Optional genre label; when present, posts are persisted under the "trending" prefix. */
  genre: z.string().optional(),
});

type CollectKind = z.infer<typeof CollectKindSchema>;

const DATASET_ENV: Record<CollectKind, string> = {
  posts: "BRIGHT_DATA_DATASET_POSTS",
  reels: "BRIGHT_DATA_DATASET_REELS",
  comments: "BRIGHT_DATA_DATASET_COMMENTS",
  hashtag: "BRIGHT_DATA_DATASET_HASHTAG",
};

export async function POST(req: Request): Promise<NextResponse> {
  const parsed = RequestSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid request body" },
      { status: 400 },
    );
  }
  const { type, target, genre } = parsed.data;

  const datasetId = process.env[DATASET_ENV[type]];
  if (!process.env.BRIGHT_DATA_API_KEY || !datasetId) {
    return NextResponse.json(
      { ok: false, error: `missing env for type=${type}` },
      { status: 503 },
    );
  }

  const isTrending = type === "hashtag" && Boolean(genre);
  const sourceHashtag = type === "hashtag" ? normalizeHashtag(target) : undefined;

  try {
    const triggerRes = await fetchDataset({
      datasetId,
      payload: buildInput(type, target),
    });
    const snapshotId = extractSnapshotId(triggerRes);
    const raw = snapshotId ? await pollSnapshot(snapshotId) : triggerRes;
    const posts = parsePosts(raw).map((p) =>
      sourceHashtag ? { ...p, source_hashtag: sourceHashtag } : p,
    );
    const prefix = isTrending ? "trending" : type;
    const stored = await persistJson(prefix, posts);
    let rawLocation: string | undefined;
    if (posts.length === 0) {
      const rawStored = await persistJson(`${prefix}-raw`, raw);
      rawLocation = rawStored.location;
    }
    return NextResponse.json({
      ok: true,
      count: posts.length,
      file: stored.location,
      name: stored.name,
      ...(genre ? { genre } : {}),
      ...(sourceHashtag ? { source_hashtag: sourceHashtag } : {}),
      ...(snapshotId ? { snapshot_id: snapshotId } : {}),
      ...(rawLocation ? { raw: rawLocation } : {}),
    });
  } catch (err) {
    const status = err instanceof BrightDataError ? 502 : 500;
    const error = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error }, { status });
  }
}

function normalizeHashtag(target: string): string {
  return target.startsWith("#") ? target : `#${target}`;
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export interface CollectedFileEntry extends StoredFile {
  type: CollectKind | "trending" | "unknown";
}

export async function GET(): Promise<NextResponse> {
  try {
    const files = await listCollected();
    const collected: CollectedFileEntry[] = files.map((f) => ({
      ...f,
      type: matchKind(f.name) ?? "unknown",
    }));
    return NextResponse.json({ ok: true, files: collected });
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

function matchKind(name: string): CollectKind | "trending" | null {
  const prefix = name.split("-")[0];
  if (prefix === "trending") return "trending";
  return CollectKindSchema.safeParse(prefix).success
    ? (prefix as CollectKind)
    : null;
}

function buildInput(type: CollectKind, target: string): unknown[] {
  const base = "https://www.instagram.com";
  switch (type) {
    case "posts":
    case "reels":
    case "comments":
      return [{ url: `${base}/${target.replace(/^@/, "")}/` }];
    case "hashtag":
      return [{ url: `${base}/explore/tags/${target.replace(/^#/, "")}/` }];
  }
}
