/**
 * Pure scoring functions for Instagram posts.
 */

import { DEFAULT_THRESHOLDS, type Thresholds } from "@/config/thresholds";
import type { Post, Scored } from "@/types/post";

export type { Post, Scored };

/**
 * Median of a numeric array. Empty array returns 0.
 * Even-length arrays return the average of the two middle elements.
 */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Median engagement (likes + comments) across an account's posts.
 * Returns 0 if no posts are provided.
 */
export function accountMedianEngagement(posts: Post[]): number {
  if (posts.length === 0) return 0;
  return median(posts.map((p) => p.likes + p.comments));
}

/**
 * view_ratio = views / followers, but only for reels.
 * Returns null for non-reel posts or when views is missing.
 * Returns 0 when followers is 0 (avoid Infinity).
 */
export function viewRatio(post: Post): number | null {
  if (post.type !== "reel") return null;
  if (post.views === undefined) return null;
  if (post.followers === 0) return 0;
  return post.views / post.followers;
}

/**
 * engagement_jump = (likes + comments) / accountMedian.
 * Returns 0 when accountMedian is 0 (avoid division by zero).
 */
export function engagementJump(post: Post, accountMedian: number): number {
  if (accountMedian === 0) return 0;
  return (post.likes + post.comments) / accountMedian;
}

/**
 * Score a single post against an account median + thresholds.
 *
 * A post is `is_breakout` when EITHER:
 *   - view_ratio >= T_VIEW (reels only)
 *   - engagement_jump >= T_JUMP (any type)
 */
export function score(
  post: Post,
  accountMedian: number,
  t: Thresholds = DEFAULT_THRESHOLDS,
): Scored {
  const vr = viewRatio(post);
  const ej = engagementJump(post, accountMedian);
  const viewBreakout = vr !== null && vr >= t.T_VIEW;
  const jumpBreakout = ej >= t.T_JUMP;
  return {
    ...post,
    view_ratio: vr,
    engagement_jump: ej,
    is_breakout: viewBreakout || jumpBreakout,
  };
}

/**
 * Score every post, computing each account's median engagement independently.
 */
export function scoreAll(
  posts: Post[],
  t: Thresholds = DEFAULT_THRESHOLDS,
): Scored[] {
  const byAccount = new Map<string, Post[]>();
  for (const p of posts) {
    const list = byAccount.get(p.account);
    if (list) {
      list.push(p);
    } else {
      byAccount.set(p.account, [p]);
    }
  }
  const medians = new Map<string, number>();
  for (const [acc, list] of byAccount) {
    medians.set(acc, accountMedianEngagement(list));
  }
  return posts.map((p) => score(p, medians.get(p.account) ?? 0, t));
}
