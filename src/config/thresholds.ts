/**
 * Scoring thresholds for breakout detection.
 *
 * T_VIEW: minimum view_ratio (views / followers) for a reel to count as breakout.
 * T_JUMP: minimum engagement_jump ((likes+comments) / account median) for any post
 *         type to count as breakout.
 *
 * A post is breakout if EITHER threshold is met (see scoring.ts#score).
 */
export const T_VIEW = 3.0;
export const T_JUMP = 2.0;

export type Thresholds = { T_VIEW: number; T_JUMP: number };

export const DEFAULT_THRESHOLDS: Thresholds = { T_VIEW, T_JUMP };

/**
 * Trend scoring weights (`src/lib/trending.ts`).
 *
 * trend_score = w_eph * pctRank(EPH)
 *             + w_reach * pctRank(reach_proxy)
 *             + w_rank * rank_weight
 *
 * Weights should sum to 1.0 (kept explicit for tuning clarity).
 */
export interface TrendWeights {
  eph: number;
  reach: number;
  rank: number;
}

export const TREND_WEIGHTS: TrendWeights = {
  eph: 0.5,
  reach: 0.3,
  rank: 0.2,
};
