import { CatalogAnalyzer } from "@/components/CatalogAnalyzer";
import { BRAND_NAME } from "@/config/brand";
import { loadMockPosts } from "@/lib/fixtures";
import { scoreAll } from "@/lib/scoring";
import { HOOK_TYPES, VISUAL_TYPES } from "@/lib/taxonomy";

export default async function CatalogPage() {
  const posts = await loadMockPosts();
  const scored = scoreAll(posts);
  const breakouts = scored.filter((s) => s.is_breakout);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl font-bold">③ 型カタログ</h1>
            <p className="mt-2 text-[var(--color-muted)]">
              ブレイク候補を Claude (vision) で「フック型 × ビジュアル型」に分解。
              対象ブランド: <strong>{BRAND_NAME}</strong>
            </p>
          </div>
          <span
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
              hasAnthropic
                ? "bg-emerald-100 text-emerald-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {hasAnthropic ? "Anthropic 接続 OK" : "Anthropic 未接続 (503)"}
          </span>
        </div>
      </header>

      {breakouts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-accent-soft)] p-8 text-center text-[var(--color-muted)]">
          ブレイク候補がありません。② ブレイク検出タブで閾値を確認してください。
        </p>
      ) : (
        <CatalogAnalyzer
          candidates={breakouts}
          hookTypes={HOOK_TYPES}
          visualTypes={VISUAL_TYPES}
          brandName={BRAND_NAME}
        />
      )}
    </div>
  );
}
