import { VoiceAnalyzer } from "@/components/VoiceAnalyzer";
import { loadAllTrending } from "@/lib/loadTrending";

export const dynamic = "force-dynamic";

const TOP_N = 20;

export default async function VoicePage() {
  const trending = await loadAllTrending();
  const withComments = trending
    .filter((t) => t.comment_texts && t.comment_texts.length > 0)
    .slice(0, TOP_N);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl font-bold">④ 声分析</h1>
            <p className="mt-2 text-[var(--color-muted)]">
              トレンド上位のうちコメント付きの投稿を Claude に投げ、顕在ニーズ・潜在欲求
              <span className="mx-1 rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px]">
                要検証
              </span>
              ・投稿への示唆を抽出します。
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

      {withComments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-accent-soft)] p-8 text-center text-[var(--color-muted)]">
          コメント本文付きのトレンド投稿がありません。
          <code>/collect</code> でジャンルを選んで取得すると、コメントを含む投稿が現れます。
        </p>
      ) : (
        <VoiceAnalyzer posts={withComments} />
      )}
    </div>
  );
}
