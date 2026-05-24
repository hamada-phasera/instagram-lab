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

import { BrightDataError, fetchDataset, parsePosts } from "@/lib/brightdata";
import { listCollected, persistJson, type StoredFile } from "@/lib/storage";

export const runtime = "nodejs";

const CollectKindSchema = z.enum(["posts", "reels", "comments", "hashtag"]);
const RequestSchema = z.object({
  type: CollectKindSchema,
  target: z.string().min(1),
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
  const { type, target } = parsed.data;

  const datasetId = process.env[DATASET_ENV[type]];
  if (!process.env.BRIGHT_DATA_API_KEY || !datasetId) {
    return NextResponse.json(
      { ok: false, error: `missing env for type=${type}` },
      { status: 503 },
    );
  }

  try {
    const raw = await fetchDataset({ datasetId, payload: { target } });
    const posts = parsePosts(raw);
    const stored = await persistJson(type, posts);
    return NextResponse.json({
      ok: true,
      count: posts.length,
      file: stored.location,
      name: stored.name,
    });
  } catch (err) {
    const status = err instanceof BrightDataError ? 502 : 500;
    const error = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error }, { status });
  }
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export interface CollectedFileEntry extends StoredFile {
  type: CollectKind | "unknown";
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

function matchKind(name: string): CollectKind | null {
  const prefix = name.split("-")[0];
  return CollectKindSchema.safeParse(prefix).success
    ? (prefix as CollectKind)
    : null;
}
