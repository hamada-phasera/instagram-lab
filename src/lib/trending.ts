/**
 * Trend scoring — pure functions, no I/O.
 *
 * Genre-scoped ranking. Posts are scored cross-account by combining
 * engagement velocity (EPH), reach proxy, and within-genre rank. All
 * metrics are proxies — "estimated trend score", not a viral guarantee
 * (see CLAUDE.md "Forbidden Actions / データ").
 *
 * Inputs: an array of `Post` records with at least one of
 *   - `date_iso` (preferred) or `date` (`YYYY-MM-DD`)
 *   - `source_account` (the seed profile a post was discovered from) —
 *     optional; used for display and dedupe metadata only
 *   - `followers`, `likes`, `comments`, optional `views`
 *
 * Outputs: an array of `Trending` records, one per unique `post_url`,
 * sorted by `trend_score` desc.
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
  accounts: Set<string>;
}

/**
 * Aggregate `Post[]` into trending records (genre-scoped).
 *
 * Steps:
 * 1. Dedupe by `post_url`, keeping the entry with max likes. Collect
 *    `source_account` per appearance into a set.
 * 2. Compute EPH and reach_proxy for each post; rank by EPH within the
 *    genre to derive `genre_rank` (1-indexed).
 * 3. trend_score = w_eph·pctRank(EPH) + w_reach·pctRank(reach) + w_rank·rank_weight.
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
    const acct = p.source_account;
    const existing = byUrl.get(p.post_url);
    if (!existing) {
      byUrl.set(p.post_url, {
        post: p,
        accounts: acct ? new Set([acct]) : new Set(),
      });
    } else {
      if (acct) existing.accounts.add(acct);
      if (p.likes > existing.post.likes) {
        existing.post = { ...p, source_account: existing.post.source_account };
      }
    }
  }

  const aggs = [...byUrl.values()];
  const ephs = aggs.map((a) => computeEPH(a.post, now));
  const reaches = aggs.map((a) => computeReachProxy(a.post));
  const ephPct = percentileRank(ephs);
  const reachPct = percentileRank(reaches);

  const orderedIdx = aggs
    .map((_, i) => i)
    .sort((a, b) => ephs[b] - ephs[a]);
  const rankByIdx = new Array<number>(aggs.length);
  for (let r = 0; r < orderedIdx.length; r++) {
    rankByIdx[orderedIdx[r]] = r + 1;
  }

  const out: Trending[] = aggs.map((agg, i) => {
    const genre_rank = rankByIdx[i];
    const rank_weight = computeRankWeight(genre_rank);
    const trend_score =
      weights.eph * ephPct[i] +
      weights.reach * reachPct[i] +
      weights.rank * rank_weight;
    return {
      ...agg.post,
      eph: ephs[i],
      reach_proxy: reaches[i],
      genre_rank,
      rank_weight,
      trend_score,
      genre,
      source_accounts: [...agg.accounts].sort(),
    };
  });

  return out.sort((a, b) => b.trend_score - a.trend_score);
}
