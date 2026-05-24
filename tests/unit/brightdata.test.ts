import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BrightDataError,
  fetchDataset,
  parsePosts,
} from "@/lib/brightdata";

const MOCK_POSTS_PATH = path.join(
  process.cwd(),
  "tests/mocks/posts.json",
);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchDataset", () => {
  const originalApiKey = process.env.BRIGHT_DATA_API_KEY;

  beforeEach(() => {
    process.env.BRIGHT_DATA_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.BRIGHT_DATA_API_KEY;
    else process.env.BRIGHT_DATA_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on 200 and sends Bearer auth", async () => {
    const payload = { target: "frijoles_tokyo" };
    const expected = { snapshot_id: "snap_123" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, expected));

    const result = await fetchDataset({ datasetId: "ds_1", payload });

    expect(result).toEqual(expected);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("dataset_id=ds_1");
    expect(String(url)).toContain("format=json");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(init?.body).toBe(JSON.stringify(payload));
  });

  it("throws BrightDataError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(
      fetchDataset({ datasetId: "ds_1", payload: {} }),
    ).rejects.toBeInstanceOf(BrightDataError);
  });

  it("throws BrightDataError when API key is missing", async () => {
    delete process.env.BRIGHT_DATA_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      fetchDataset({ datasetId: "ds_1", payload: {} }),
    ).rejects.toBeInstanceOf(BrightDataError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("parsePosts", () => {
  it("returns a Post[] from the mock fixture", async () => {
    const raw = JSON.parse(await readFile(MOCK_POSTS_PATH, "utf8"));
    const posts = parsePosts(raw);

    expect(posts.length).toBeGreaterThan(0);
    expect(posts.length).toBe((raw as unknown[]).length);
    for (const p of posts) {
      expect(typeof p.account).toBe("string");
      expect(["reel", "feed", "carousel"]).toContain(p.type);
      expect(p.followers).toBeGreaterThanOrEqual(0);
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("skips entries that are missing required fields", () => {
    const posts = parsePosts([
      { type: "reel" },
      null,
      "not-an-object",
      {
        account: "ok",
        followers: 1,
        type: "feed",
        likes: 1,
        comments: 1,
        caption: "",
        hashtags: [],
        date: "2026-05-20",
        post_url: "https://example.com/p/1",
        thumbnail_url: "https://example.com/t/1.jpg",
      },
    ]);
    expect(posts).toHaveLength(1);
    expect(posts[0].account).toBe("ok");
  });

  it("accepts the { data: [...] } envelope shape", async () => {
    const arr = JSON.parse(await readFile(MOCK_POSTS_PATH, "utf8")) as unknown[];
    const posts = parsePosts({ data: arr });
    expect(posts.length).toBe(arr.length);
  });

  it("returns [] for unrecognised payloads", () => {
    expect(parsePosts(null)).toEqual([]);
    expect(parsePosts(42)).toEqual([]);
    expect(parsePosts({ foo: "bar" })).toEqual([]);
  });
});
