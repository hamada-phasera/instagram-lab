/**
 * Hook x Visual taxonomy for trending post classification.
 *
 * `HOOK_TYPES` describes the narrative hook of the post (caption / opening line).
 * `VISUAL_TYPES` describes the dominant visual treatment of the thumbnail / first
 * frame. The full 5x5 matrix is exposed via `matrix()` for downstream analysis.
 */

export const HOOK_TYPES = [
  "意外性/常識破壊",
  "保存性/ハック",
  "シズル/断面",
  "数字/ランキング",
  "ローカル/地名",
] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const VISUAL_TYPES = [
  "1枚目文字量",
  "高コントラスト/色数",
  "寄り/質感",
  "人の気配",
  "スケール/インパクト",
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

export type Tag = { hook: HookType; visual: VisualType };

/**
 * Returns every (hook, visual) pair — 25 entries.
 * Iteration order: outer loop hook, inner loop visual.
 */
export function matrix(): Tag[] {
  const out: Tag[] = [];
  for (const hook of HOOK_TYPES) {
    for (const visual of VISUAL_TYPES) {
      out.push({ hook, visual });
    }
  }
  return out;
}

export function isHookType(s: string): s is HookType {
  return (HOOK_TYPES as readonly string[]).includes(s);
}

export function isVisualType(s: string): s is VisualType {
  return (VISUAL_TYPES as readonly string[]).includes(s);
}
