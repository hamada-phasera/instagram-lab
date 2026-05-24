import { describe, expect, it } from "vitest";

import {
  accountMedianEngagement,
  engagementJump,
  median,
  type Post,
  score,
  scoreAll,
  viewRatio,
} from "@/lib/scoring";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    account: "acct_a",
    followers: 1000,
    type: "feed",
    likes: 100,
    comments: 10,
    caption: "",
    hashtags: [],
    date: "2026-01-01",
    post_url: "https://example.com/p/1",
    thumbnail_url: "https://example.com/t/1.jpg",
    ...overrides,
  };
}

describe("median", () => {
  it("returns 0 for an empty array", () => {
    expect(median([])).toBe(0);
  });

  it("returns the average of the middle two for even-length input", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns the middle value for odd-length input", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
});

describe("accountMedianEngagement", () => {
  it("computes median of likes + comments across posts", () => {
    const posts = [
      makePost({ likes: 10, comments: 0 }), // 10
      makePost({ likes: 20, comments: 5 }), // 25
      makePost({ likes: 50, comments: 0 }), // 50
    ];
    expect(accountMedianEngagement(posts)).toBe(25);
  });

  it("returns 0 for empty input", () => {
    expect(accountMedianEngagement([])).toBe(0);
  });
});

describe("viewRatio", () => {
  it("returns views/followers for a reel", () => {
    const p = makePost({ type: "reel", followers: 1000, views: 5000 });
    expect(viewRatio(p)).toBe(5.0);
  });

  it("returns null for a feed post", () => {
    const p = makePost({ type: "feed", views: 5000 });
    expect(viewRatio(p)).toBeNull();
  });

  it("returns null for a carousel post", () => {
    const p = makePost({ type: "carousel", views: 5000 });
    expect(viewRatio(p)).toBeNull();
  });

  it("returns null when views are missing on a reel", () => {
    const p = makePost({ type: "reel" });
    expect(viewRatio(p)).toBeNull();
  });

  it("returns 0 (not Infinity) when followers is 0", () => {
    const p = makePost({ type: "reel", followers: 0, views: 5000 });
    expect(viewRatio(p)).toBe(0);
  });
});

describe("engagementJump", () => {
  it("returns (likes+comments)/median", () => {
    const p = makePost({ likes: 80, comments: 20 });
    expect(engagementJump(p, 50)).toBe(2);
  });

  it("returns 0 when the account median is 0 (avoids div by zero)", () => {
    const p = makePost({ likes: 80, comments: 20 });
    expect(engagementJump(p, 0)).toBe(0);
  });
});

describe("score", () => {
  it("marks a reel as breakout when view_ratio is exactly T_VIEW (>=)", () => {
    const p = makePost({ type: "reel", followers: 1000, views: 3000 });
    const s = score(p, 1000);
    expect(s.view_ratio).toBe(3.0);
    expect(s.is_breakout).toBe(true);
  });

  it("does NOT mark a reel as breakout when view_ratio is just below T_VIEW", () => {
    const p = makePost({
      type: "reel",
      followers: 1000,
      views: 2990,
      likes: 10,
      comments: 0,
    });
    const s = score(p, 1000);
    expect(s.view_ratio).toBeCloseTo(2.99, 5);
    expect(s.is_breakout).toBe(false);
  });

  it("marks a non-reel as breakout when engagement_jump >= T_JUMP", () => {
    // feed post, view_ratio is null, engagement_jump = 250/100 = 2.5
    const p = makePost({
      type: "feed",
      likes: 200,
      comments: 50,
    });
    const s = score(p, 100);
    expect(s.view_ratio).toBeNull();
    expect(s.engagement_jump).toBe(2.5);
    expect(s.is_breakout).toBe(true);
  });

  it("is NOT breakout when both signals are below thresholds", () => {
    const p = makePost({
      type: "reel",
      followers: 1000,
      views: 1000, // view_ratio = 1
      likes: 50,
      comments: 0, // jump = 50/100 = 0.5
    });
    const s = score(p, 100);
    expect(s.is_breakout).toBe(false);
  });
});

describe("scoreAll", () => {
  it("computes account medians independently for mixed accounts", () => {
    const posts: Post[] = [
      // Account A: medians of [10, 30, 50] = 30
      makePost({ account: "A", likes: 10, comments: 0 }),
      makePost({ account: "A", likes: 30, comments: 0 }),
      makePost({ account: "A", likes: 50, comments: 0 }),
      // Account B: medians of [100, 200, 300] = 200
      makePost({ account: "B", likes: 100, comments: 0 }),
      makePost({ account: "B", likes: 200, comments: 0 }),
      makePost({ account: "B", likes: 300, comments: 0 }),
    ];
    const out = scoreAll(posts);
    // A's "50" post: 50 / 30 ≈ 1.666...
    const aTop = out.find((p) => p.account === "A" && p.likes === 50);
    expect(aTop?.engagement_jump).toBeCloseTo(50 / 30, 5);
    // B's "300" post: 300 / 200 = 1.5
    const bTop = out.find((p) => p.account === "B" && p.likes === 300);
    expect(bTop?.engagement_jump).toBe(1.5);
    // Length preserved + order preserved
    expect(out).toHaveLength(posts.length);
    expect(out.map((p) => p.account)).toEqual(posts.map((p) => p.account));
  });

  it("handles a single post per account without crashing", () => {
    const posts: Post[] = [makePost({ account: "solo", likes: 5, comments: 5 })];
    const out = scoreAll(posts);
    // median == 10, jump == 10/10 == 1
    expect(out[0].engagement_jump).toBe(1);
  });
});

describe("edge cases", () => {
  it("followers=0 reel produces view_ratio=0, not Infinity", () => {
    const p = makePost({
      type: "reel",
      followers: 0,
      views: 9999,
    });
    const s = score(p, 100);
    expect(s.view_ratio).toBe(0);
    expect(Number.isFinite(s.view_ratio ?? 0)).toBe(true);
  });
});
