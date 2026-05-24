/**
 * Target Instagram accounts for Bright Data collection.
 * Edit this list per project — UI reads from here, not from mock fixtures.
 */

export interface TargetAccount {
  username: string;
  /** Short note shown next to the username in the UI (optional). */
  note?: string;
  /** Mark the own brand to highlight it in the breakout list. */
  isOwn?: boolean;
}

export const TARGET_ACCOUNTS: TargetAccount[] = [
  { username: "frijoles_tokyo", note: "自社", isOwn: true },
  { username: "veggie_cafe_jp" },
  { username: "salad_lab_osaka" },
];
