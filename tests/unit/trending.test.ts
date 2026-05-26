import { describe, expect, it } from "vitest";

import {
  computeEPH,
  computeHoursSincePost,
  computeRankWeight,
  computeReachProxy,
  computeTrending,
  percentileRank,
} from "@/lib/trending";
import type { Post } from "@/types/post";

const NOW = new Date("2026-05-25T12:00:00.000Z");

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    account: "demo",
    followers: 1000,
    type: "feed",
    likes: 100,
    comments: 10,
    caption: "",
    hashtags: [],
    date: "2026-05-25",
    post_url: `https://www.instagram.com/p/${Math.random().toString(36).slice(2)}/`,
    thumbnail_url: "https://example.com/t.jpg",
    ...overrides,
  };
}

describe("computeHoursSincePost", () => {
  it("returns hours from date_iso when present", () => {
    const post = makePost({ date_iso: "2026-05-25T06:00:00.000Z" });
    expect(computeHoursSincePost(post, NOW)).toBe(6);
  });

  it("falls back to date (treated as midday UTC)", () => {
    const post = makePost({ date: "2026-05-24", date_iso: undefined });
    const hours = computeHoursSincePost(post, NOW);
    expect(hours).toBeCloseTo(24, 0);
  });

  it("clamps to minimum 1 for very fresh posts", () => {
    const post = makePost({ date_iso: NOW.toISOString() });
    expect(computeHoursSincePost(post, NOW)).toBe(1);
  });
});

describe("computeEPH", () => {
  it("computes (likes+comments)/hours for a 6h-old post", () => {
    const post = makePost({
      likes: 50,
      comments: 10,
      date_iso: "2026-05-25T06:00:00.000Z",
    });
    expect(computeEPH(post, NOW)).toBe(10);
  });

  it("guards against hours=0 via min-1 clamp", () => {
    const post = makePost({ likes: 7, comments: 3, date_iso: NOW.toISOString() });
    expect(computeEPH(post, NOW)).toBe(10);
  });
});

describe("computeReachProxy", () => {
  it("returns views/followers for reels with views", () => {
    const post = makePost({ type: "reel", views: 10_000, followers: 1000 });
    expect(computeReachProxy(post)).toBe(10);
  });

  it("returns likes/followers for feed (no views)", () => {
    const post = makePost({ type: "feed", likes: 500, followers: 1000 });
    expect(computeReachProxy(post)).toBe(0.5);
  });

  it("returns likes/followers for carousel", () => {
    const post = makePost({ type: "carousel", likes: 200, followers: 1000 });
    expect(computeReachProxy(post)).toBe(0.2);
  });

  it("returns 0 when followers is 0 (Infinity guard)", () => {
    const post = makePost({ followers: 0, likes: 5000 });
    expect(computeReachProxy(post)).toBe(0);
  });

  it("falls back to likes/followers when reel has views=undefined", () => {
    const post = makePost({ type: "reel", views: undefined, likes: 100, followers: 1000 });
    expect(computeReachProxy(post)).toBe(0.1);
  });
});

describe("computeRankWeight", () => {
  it("rank 1 → 1.0", () => {
    expect(computeRankWeight(1)).toBe(1);
  });

  it("rank 10 → 1/log2(11) ≈ 0.289", () => {
    expect(computeRankWeight(10)).toBeCloseTo(0.289, 3);
  });

  it("invalid rank → 0", () => {
    expect(computeRankWeight(0)).toBe(0);
    expect(computeRankWeight(-1)).toBe(0);
    expect(computeRankWeight(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("percentileRank", () => {
  it("monotonic distinct values map to evenly spaced [0,1]", () => {
    expect(percentileRank([10, 20, 30, 40])).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it("ties get the same averaged percentile", () => {
    const result = percentileRank([5, 5, 10]);
    expect(result[0]).toBeCloseTo(result[1], 6);
    expect(result[2]).toBe(1);
  });

  it("empty → []", () => {
    expect(percentileRank([])).toEqual([]);
  });

  it("single → [1]", () => {
    expect(percentileRank([42])).toEqual([1]);
  });
});

describe("computeTrending", () => {
  it("returns [] for empty input", () => {
    expect(computeTrending([], "飲食", { now: NOW })).toEqual([]);
  });

  it("sorts by trend_score desc and never returns NaN", () => {
    const posts: Post[] = [
      makePost({
        post_url: "https://example.com/a",
        likes: 1000,
        comments: 100,
        followers: 1000,
        type: "reel",
        views: 50000,
        date_iso: "2026-05-25T06:00:00.000Z",
        source_hashtag: "#ランチ",
      }),
      makePost({
        post_url: "https://example.com/b",
        likes: 10,
        comments: 1,
        followers: 100000,
        date_iso: "2026-05-20T00:00:00.000Z",
        source_hashtag: "#ランチ",
      }),
      makePost({
        post_url: "https://example.com/c",
        likes: 500,
        comments: 30,
        followers: 5000,
        type: "feed",
        date_iso: "2026-05-25T00:00:00.000Z",
        source_hashtag: "#ランチ",
      }),
    ];
    const out = computeTrending(posts, "飲食", { now: NOW });
    expect(out).toHaveLength(3);
    expect(out[0].trend_score).toBeGreaterThanOrEqual(out[1].trend_score);
    expect(out[1].trend_score).toBeGreaterThanOrEqual(out[2].trend_score);
    for (const t of out) {
      expect(Number.isFinite(t.trend_score)).toBe(true);
      expect(Number.isFinite(t.eph)).toBe(true);
      expect(Number.isFinite(t.reach_proxy)).toBe(true);
      expect(t.genre).toBe("飲食");
    }
  });

  it("dedupes by post_url and merges source_hashtags", () => {
    const url = "https://example.com/dup";
    const posts: Post[] = [
      makePost({ post_url: url, likes: 100, source_hashtag: "#ランチ" }),
      makePost({ post_url: url, likes: 200, source_hashtag: "#グルメ" }),
      makePost({ post_url: url, likes: 50, source_hashtag: "#カフェ" }),
    ];
    const out = computeTrending(posts, "飲食", { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].likes).toBe(200);
    expect(out[0].source_hashtags).toEqual(["#カフェ", "#グルメ", "#ランチ"]);
  });

  it("uses min (best) rank when a post spans multiple hashtags", () => {
    const posts: Post[] = [
      makePost({ post_url: "https://example.com/a", likes: 100, source_hashtag: "#ランチ" }),
      makePost({ post_url: "https://example.com/b", likes: 50, source_hashtag: "#ランチ" }),
      makePost({ post_url: "https://example.com/a", likes: 100, source_hashtag: "#グルメ" }),
    ];
    const out = computeTrending(posts, "飲食", { now: NOW });
    const a = out.find((t) => t.post_url === "https://example.com/a")!;
    expect(a.hashtag_top_rank).toBe(1);
    expect(a.rank_weight).toBe(1);
  });

  it("handles all-zero-engagement posts without NaN", () => {
    const posts: Post[] = [
      makePost({
        post_url: "https://example.com/a",
        likes: 0,
        comments: 0,
        followers: 0,
        source_hashtag: "#x",
      }),
      makePost({
        post_url: "https://example.com/b",
        likes: 0,
        comments: 0,
        followers: 0,
        source_hashtag: "#x",
      }),
    ];
    const out = computeTrending(posts, "test", { now: NOW });
    expect(out).toHaveLength(2);
    for (const t of out) {
      expect(Number.isFinite(t.trend_score)).toBe(true);
      expect(t.eph).toBe(0);
      expect(t.reach_proxy).toBe(0);
    }
  });
});
