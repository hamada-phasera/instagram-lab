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
  /** Source hashtag this post was discovered under (e.g. "#ランチ"). */
  source_hashtag?: string;
  post_url: string;
  thumbnail_url: string;
  comment_texts?: string[];
}

export interface Scored extends Post {
  /** `views / followers` — null for feed/carousel (no views available). */
  view_ratio: number | null;
  /** `(likes + comments) / account_median_engagement` — 0 when median is 0. */
  engagement_jump: number;
  /** True when either ratio crosses its threshold. Proxy metric, not "viral". */
  is_breakout: boolean;
}

export interface Trending extends Post {
  /** Engagement per hour: (likes+comments) / hours_since_post. */
  eph: number;
  /** Reach proxy: views/followers (reel) or likes/followers (feed/carousel). */
  reach_proxy: number;
  /** Best (lowest) rank across all hashtags this post matched, 1-indexed. */
  hashtag_top_rank: number;
  /** `1 / log2(hashtag_top_rank + 1)` — DCG-style positional weight. */
  rank_weight: number;
  /** Final composite score in [0,1]. "Estimated trend score", not a viral guarantee. */
  trend_score: number;
  /** Genre this post was discovered under. */
  genre: string;
  /** All source hashtags this post was matched on (deduped). */
  source_hashtags: string[];
}
