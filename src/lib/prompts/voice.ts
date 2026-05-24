/**
 * Voice (comment) analysis prompts — requirements.md §4-A.
 *
 * The system prompt is sent with `cache_control: { type: "ephemeral" }` so
 * repeated calls within the 5-min window only pay for the user message.
 */

export const VOICE_SYSTEM =
  "あなたは飲食店のSNSコメント分析の専門家です。以下は食ジャンルのInstagram投稿に寄せられたコメント群です。分析し、必ず指定JSONのみで出力（前置き・コードフェンス禁止）。";

const VOICE_USER_TEMPLATE = `コメント:
"""
{comments}
"""
出力JSON:
{
  "surface_needs":[{"category":"短い名","weight":"高|中|低","sentiment":"ポジ|ネガ|中立","examples":["抜粋","抜粋"]}],
  "latent_desires":[{"hypothesis":"明示されない潜在欲求","evidence":"推論根拠","confidence":"高|中|低"}],
  "content_implications":["投稿に活かす具体アクション"]
}
ルール: surface最大6/latent最大4(必ず仮説)/implications最大4/examplesは2、日本語。`;

/**
 * Build the user-side prompt by injecting comments between the triple-quote
 * fence. Comments are joined with newlines so each line is one comment.
 */
export function buildVoicePrompt(comments: string[]): string {
  const joined = comments.join("\n");
  return VOICE_USER_TEMPLATE.replace("{comments}", joined);
}
