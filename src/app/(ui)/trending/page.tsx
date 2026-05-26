import { TrendingFeed } from "@/components/TrendingFeed";
import { GENRES } from "@/config/genres";
import { loadAllTrending } from "@/lib/loadTrending";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const trending = await loadAllTrending();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">② トレンド</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          ジャンル横断で <strong>推定トレンドスコア</strong> 順に並んだ投稿一覧。サムネをクリックすると
          埋め込みプレビューが開きます。スコアは <code>EPH × reach × hashtag順位</code> の合成指標で、
          確定的なバズ判定ではありません。
        </p>
      </header>

      <TrendingFeed posts={trending} genres={GENRES.map((g) => g.name)} />
    </div>
  );
}
