/**
 * Trend scoring — pure functions, no I/O.
 *
 * Replaces the per-account `scoring.ts` baseline. Trending posts are scored
 * cross-account by combining engagement velocity (EPH), reach proxy, and
 * within-hashtag rank. All metrics are proxies — "estimated trend score",
 * not a viral guarantee (see CLAUDE.md "Forbidden Actions / データ").
 *
 * Inputs: an array of `Post` records with at least one of
 *   - `date_iso` (preferred) or `date` (`YYYY-MM-DD`)
 *   - `source_hashtag` (the hashtag the post was discovered under)
 *   - `followers`, `likes`, `comments`, optional `views`
 *
 * Outputs: an array of `Trending` records, one per unique `post_url`, sorted
 * by `trend_score` desc.
 */

import type { Post, Trending } from "@/types/post";
import { TREND_WEIGHTS, type TrendWeights } from "@/config/thresholds";

export interface TrendingOptions {
  /** Override "now" for deterministic scoring. Defaults to Date.now(). */
  now?: Date;
  /** Override weights from config. */
  weights?: TrendWeights;
}

/** Hours since post; clamped to a minimum of 1 to guard against division blowups for very fresh posts. */
export function computeHoursSincePost(post: Post, now: Date = new Date()): number {
  const iso = post.date_iso ?? (post.date ? `${post.date}T12:00:00Z` : null);
  if (!iso) return 1;
  const posted = Date.parse(iso);
  if (!Number.isFinite(posted)) return 1;
  const diffMs = now.getTime() - posted;
  const hours = diffMs / 3_600_000;
  return Math.max(1, hours);
}

/** Engagement per hour: `(likes + comments) / hours_since_post`. */
export function computeEPH(post: Post, now: Date = new Date()): number {
  const hours = computeHoursSincePost(post, now);
  return (post.likes + post.comments) / hours;
}

/**
 * Reach proxy: `views/followers` for reels, `likes/followers` for feed/carousel.
 * Returns 0 when followers is 0 or missing (prevents Infinity).
 */
export function computeReachProxy(post: Post): number {
  if (!post.followers || post.followers <= 0) return 0;
  if (post.type === "reel" && typeof post.views === "number" && post.views > 0) {
    return post.views / post.followers;
  }
  return post.likes / post.followers;
}

/** DCG-style rank weight: 1.0 at rank 1, ~0.30 at rank 10, decaying. */
export function computeRankWeight(rank: number): number {
  if (!Number.isFinite(rank) || rank < 1) return 0;
  return 1 / Math.log2(rank + 1);
}

/**
 * Percentile rank of each value within the array, in [0,1].
 * Tie-breaking: average rank (so ties get the same percentile).
 * Empty input returns an empty array. Length-1 input returns [1].
 */
export function percentileRank(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const indexed = values.map((v, i) => ({ v, i }));
  const sorted = [...indexed].sort((a, b) => a.v - b.v);

  const avgRank = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].v === sorted[i].v) j++;
    const meanRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) avgRank[sorted[k].i] = meanRank;
    i = j + 1;
  }
  return avgRank.map((r) => (r - 1) / (n - 1));
}

interface RawAggregate {
  post: Post;
  hashtags: Set<string>;
  topRank: number;
}

/**
 * Aggregate `Post[]` into trending records.
 *
 * Steps:
 * 1. Dedupe by `post_url`, keeping the entry with max likes.
 *    Collect `source_hashtag` per appearance into a set.
 * 2. For each unique hashtag, rank posts by EPH and remember each post's
 *    best (lowest) rank.
 * 3. Compute EPH and reach_proxy for each post; percentile-rank them across
 *    the whole input.
 * 4. trend_score = weighted sum of pctRank(EPH), pctRank(reach), rank_weight.
 *
 * @param genre - genre label embedded into every output record (UI grouping).
 */
export function computeTrending(
  posts: Post[],
  genre: string,
  opts: TrendingOptions = {},
): Trending[] {
  if (posts.length === 0) return [];
  const now = opts.now ?? new Date();
  const weights = opts.weights ?? TREND_WEIGHTS;

  const byUrl = new Map<string, RawAggregate>();
  for (const p of posts) {
    const tag = p.source_hashtag;
    const existing = byUrl.get(p.post_url);
    if (!existing) {
      byUrl.set(p.post_url, {
        post: p,
        hashtags: tag ? new Set([tag]) : new Set(),
        topRank: Number.POSITIVE_INFINITY,
      });
    } else {
      if (tag) existing.hashtags.add(tag);
      if (p.likes > existing.post.likes) existing.post = { ...p, source_hashtag: existing.post.source_hashtag };
    }
  }

  const tagToPosts = new Map<string, RawAggregate[]>();
  for (const agg of byUrl.values()) {
    for (const tag of agg.hashtags) {
      const list = tagToPosts.get(tag) ?? [];
      list.push(agg);
      tagToPosts.set(tag, list);
    }
  }
  for (const list of tagToPosts.values()) {
    const ephs = list.map((a) => computeEPH(a.post, now));
    const sortedIdx = list
      .map((_, i) => i)
      .sort((a, b) => ephs[b] - ephs[a]);
    for (let rank = 0; rank < sortedIdx.length; rank++) {
      const agg = list[sortedIdx[rank]];
      const r = rank + 1;
      if (r < agg.topRank) agg.topRank = r;
    }
  }

  const aggs = [...byUrl.values()];
  const ephs = aggs.map((a) => computeEPH(a.post, now));
  const reaches = aggs.map((a) => computeReachProxy(a.post));
  const ephPct = percentileRank(ephs);
  const reachPct = percentileRank(reaches);

  const out: Trending[] = aggs.map((agg, i) => {
    const topRank = Number.isFinite(agg.topRank) ? agg.topRank : 1;
    const rank_weight = computeRankWeight(topRank);
    const trend_score =
      weights.eph * ephPct[i] +
      weights.reach * reachPct[i] +
      weights.rank * rank_weight;
    return {
      ...agg.post,
      eph: ephs[i],
      reach_proxy: reaches[i],
      hashtag_top_rank: topRank,
      rank_weight,
      trend_score,
      genre,
      source_hashtags: [...agg.hashtags].sort(),
    };
  });

  return out.sort((a, b) => b.trend_score - a.trend_score);
}
