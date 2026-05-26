/**
 * Storage adapter for collected dataset JSON files.
 *
 * Picks backend by env:
 *   - `BLOB_READ_WRITE_TOKEN` set → Vercel Blob (production / preview deployments)
 *   - otherwise                  → local `data/*.json` (dev convenience)
 *
 * The Blob path is required for Vercel serverless deployments because the
 * function filesystem is ephemeral and largely read-only.
 */

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredFile {
  name: string;
  bytes: number;
  mtime: string;
  url?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function persistJson(
  prefix: string,
  data: unknown,
): Promise<{ name: string; location: string }> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${prefix}-${ts}.json`;
  const body = JSON.stringify(data, null, 2);

  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const result = await put(`collected/${name}`, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { name, location: result.url };
  }

  await mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, name);
  await writeFile(filePath, body, "utf8");
  return { name, location: filePath };
}

export async function listCollected(): Promise<StoredFile[]> {
  if (useBlob()) {
    const { list } = await import("@vercel/blob");
    const res = await list({
      prefix: "collected/",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.blobs
      .map((b) => ({
        name: b.pathname.replace(/^collected\//, ""),
        bytes: b.size,
        mtime: b.uploadedAt.toISOString(),
        url: b.url,
      }))
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
  }

  try {
    const entries = await readdir(DATA_DIR);
    const out: StoredFile[] = [];
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const info = await stat(path.join(DATA_DIR, name));
      out.push({ name, bytes: info.size, mtime: info.mtime.toISOString() });
    }
    return out.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch (err) {
    if (isNodeNotFound(err)) return [];
    throw err;
  }
}

/**
 * Read a previously persisted JSON file by name. Returns null if not found.
 * For Blob backend the file is fetched over HTTP via its public URL.
 */
export async function readCollectedJson<T>(name: string): Promise<T | null> {
  if (useBlob()) {
    const files = await listCollected();
    const match = files.find((f) => f.name === name);
    if (!match?.url) return null;
    const res = await fetch(match.url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  }
  try {
    const body = await readFile(path.join(DATA_DIR, name), "utf8");
    return JSON.parse(body) as T;
  } catch (err) {
    if (isNodeNotFound(err)) return null;
    throw err;
  }
}

function isNodeNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "ENOENT"
  );
}
