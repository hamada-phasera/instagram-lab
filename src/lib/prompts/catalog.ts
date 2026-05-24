/**
 * Catalog (hook × visual) prompts — requirements.md §4-B.
 *
 * Vision call: first-frame thumbnail + caption → fook-type / visual-type
 * breakdown with a brand-translation hint. System prompt uses ephemeral
 * cache so the static directive is not re-billed per call.
 */

export const CATALOG_SYSTEM =
  "あなたはSNSフィードのクリエイティブ・ディレクターです。次の投稿（1枚目画像＋キャプション）がなぜ\"フォロワー外の初見ユーザーの指を止め得たか\"を分解してください。必ず指定JSONのみ。";

const CATALOG_USER_TEMPLATE = `キャプション: {caption}
（画像は thumbnail を image ブロックで添付）
出力JSON:
{
  "hook_type":"意外性/常識破壊|保存性/ハック|シズル/断面|数字/ランキング|ローカル/地名",
  "visual_type":"1枚目文字量|高コントラスト/色数|寄り/質感|人の気配|スケール/インパクト",
  "why_stops_scroll":"視線が止まる理由（1-2文）",
  "brand_translation":"これを {brand_name} の制作に翻訳した具体案（1-2文、brand_name は実行時引数）"
}`;

/**
 * Build the user-side prompt. {caption} is replaced once; {brand_name}
 * appears twice (instruction + brand label) so both are replaced.
 */
export function buildCatalogPrompt(args: {
  caption: string;
  brandName: string;
}): string {
  return CATALOG_USER_TEMPLATE.replace("{caption}", args.caption).replace(
    /\{brand_name\}/g,
    args.brandName,
  );
}
