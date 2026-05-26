import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BrightDataError,
  extractSnapshotId,
  fetchDataset,
  parsePosts,
  pollSnapshot,
} from "@/lib/brightdata";

const MOCK_POSTS_PATH = path.join(
  process.cwd(),
  "tests/mocks/posts.json",
);
const BRIGHT_DATA_POSTS_PATH = path.join(
  process.cwd(),
  "tests/mocks/posts_bright_data.json",
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

  it("extractSnapshotId picks snapshot_id from trigger response", () => {
    expect(extractSnapshotId({ snapshot_id: "sd_abc" })).toBe("sd_abc");
    expect(extractSnapshotId({ snapshot_id: "" })).toBeNull();
    expect(extractSnapshotId([])).toBeNull();
    expect(extractSnapshotId(null)).toBeNull();
    expect(extractSnapshotId({ foo: "bar" })).toBeNull();
  });

  it("normalizes real Bright Data output (content_type / user_posted / num_comments / date_posted ISO / hashtags=null)", async () => {
    const raw = JSON.parse(await readFile(BRIGHT_DATA_POSTS_PATH, "utf8"));
    const posts = parsePosts(raw);

    expect(posts.length).toBe(3);

    const reel = posts.find((p) => p.type === "reel");
    expect(reel).toBeDefined();
    expect(reel!.account).toBe("frijoles_tokyo");
    expect(reel!.views).toBe(50000);
    expect(reel!.date).toBe("2024-12-20");
    expect(reel!.date_iso).toBe("2024-12-20T10:00:00.000Z");
    expect(reel!.comments).toBe(10);

    const carousel = posts.find((p) => p.type === "carousel");
    expect(carousel).toBeDefined();
    expect(carousel!.date).toBe("2024-12-18");
    expect(carousel!.hashtags).toEqual(["#lunch", "#salad"]);
    expect(carousel!.views).toBeUndefined();

    const feed = posts.find((p) => p.type === "feed");
    expect(feed).toBeDefined();
    expect(feed!.account).toBe("veggie_cafe_jp");
  });
});

describe("pollSnapshot", () => {
  const originalApiKey = process.env.BRIGHT_DATA_API_KEY;

  beforeEach(() => {
    process.env.BRIGHT_DATA_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.BRIGHT_DATA_API_KEY;
    else process.env.BRIGHT_DATA_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it("polls progress then fetches snapshot data when ready", async () => {
    const expectedData = [{ user_posted: "x", followers: 1, content_type: "Photo", likes: 1, num_comments: 0, date_posted: "2024-12-18T00:00:00Z", url: "u", thumbnail: "t", description: "" }];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { status: "running" }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "ready" }))
      .mockResolvedValueOnce(jsonResponse(200, expectedData));

    const data = await pollSnapshot("sd_test", { intervalMs: 0, maxAttempts: 5 });

    expect(data).toEqual(expectedData);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/progress/sd_test");
    expect(String(fetchSpy.mock.calls[2][0])).toContain("/snapshot/sd_test");
  });

  it("throws BrightDataError when snapshot status=failed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(200, { status: "failed", error: "scrape failed" }),
    );

    await expect(
      pollSnapshot("sd_test", { intervalMs: 0, maxAttempts: 5 }),
    ).rejects.toBeInstanceOf(BrightDataError);
  });

  it("throws BrightDataError when maxAttempts exhausted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      jsonResponse(200, { status: "running" }),
    );

    await expect(
      pollSnapshot("sd_test", { intervalMs: 0, maxAttempts: 2 }),
    ).rejects.toThrow(/still running/);
  });
});
