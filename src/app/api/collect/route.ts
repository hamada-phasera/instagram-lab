/**
 * POST /api/collect — trigger Bright Data, normalize, persist to data/*.json.
 *
 * Body: { type: "posts" | "reels" | "comments" | "hashtag", target: string }
 * Response: { ok: true, count, file } | { ok: false, error }
 *
 * Returns 503 when the relevant env vars are missing so test envs never hit
 * the real (post-paid) Bright Data API by accident — per CLAUDE.md forbidden
 * actions. Real calls are gated by a human-set .env.local.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

import { BrightDataError, fetchDataset, parsePosts } from "@/lib/brightdata";

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
    const file = await persistJson(type, posts);
    return NextResponse.json({ ok: true, count: posts.length, file });
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

async function persistJson(type: CollectKind, data: unknown): Promise<string> {
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${type}-${timestamp}.json`);
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}
