/**
 * /api/collect — Bright Data integration.
 *
 * POST: trigger fetch, normalize via parsePosts, persist to data/*.json.
 *   Body: { type: "posts" | "reels" | "comments" | "hashtag", target: string }
 *   503 when env missing (test/no-key envs never hit the post-paid API).
 * GET:  list previously persisted files under data/ (basic browsing).
 *
 * MVP storage = local FS (`data/`). This is intentional for local dev — see
 * docs/STATE.md "既知の課題". Production deploy on Vercel requires migrating
 * persistJson() to Vercel Blob / Neon (a serverless function's FS is ephemeral
 * and largely read-only).
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
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

export interface CollectedFile {
  name: string;
  type: CollectKind;
  bytes: number;
  mtime: string;
}

export async function GET(): Promise<NextResponse> {
  const dir = path.join(process.cwd(), "data");
  try {
    const entries = await readdir(dir);
    const collected: CollectedFile[] = [];
    for (const name of entries) {
      const kind = entries.length > 0 ? matchKind(name) : null;
      if (!kind) continue;
      const info = await stat(path.join(dir, name));
      collected.push({
        name,
        type: kind,
        bytes: info.size,
        mtime: info.mtime.toISOString(),
      });
    }
    collected.sort((a, b) => b.mtime.localeCompare(a.mtime));
    return NextResponse.json({ ok: true, files: collected });
  } catch (err) {
    if (isNodeNotFound(err)) {
      return NextResponse.json({ ok: true, files: [] });
    }
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

function isNodeNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "ENOENT"
  );
}
