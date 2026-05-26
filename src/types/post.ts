/**
 * Shared post types for the instagram-lab data pipeline.
 *
 * Owned by M2 (data layer). Consumed by M3 (scoring), M4 (UI), M5 (Claude).
 * Keep this file dependency-free so any layer can import it without cycles.
 */

export type MediaType = "reel" | "feed" | "carousel";

export interface Post {
  account: string;
  followers: number;
  type: MediaType;
  likes: number;
  comments: number;
  views?: number;
  caption: string;
  hashtags: string[];
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** Full ISO 8601 timestamp ("2026-05-24T03:12:00.000Z") when available. */
  date_iso?: string;
  /** Source seed account this post was discovered from (e.g. "foodandwine"). */
  source_account?: string;
  /** Legacy: source hashtag (used in earlier snapshots, kept for back-compat reads). */
  source_hashtag?: string;
  post_url: string;
  thumbnail_url: string;
  comment_texts?: string[];
}

export interface Trending extends Post {
  /** Engagement per hour: (likes+comments) / hours_since_post. */
  eph: number;
  /** Reach proxy: views/followers (reel) or likes/followers (feed/carousel). */
  reach_proxy: number;
  /** Rank within the genre by EPH, 1-indexed (1 = best). */
  genre_rank: number;
  /** `1 / log2(genre_rank + 1)` — DCG-style positional weight. */
  rank_weight: number;
  /** Final composite score in [0,1]. "Estimated trend score", not a viral guarantee. */
  trend_score: number;
  /** Genre this post was discovered under. */
  genre: string;
  /** All source seed accounts this post matched (usually one, but kept as set for safety). */
  source_accounts: string[];
}
