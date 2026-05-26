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
