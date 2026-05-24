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
