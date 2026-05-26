import { TrendingFeed } from "@/components/TrendingFeed";
import { findGenreByHashtag, GENRES } from "@/config/genres";
import { listCollected, readCollectedJson } from "@/lib/storage";
import { computeTrending } from "@/lib/trending";
import type { Post, Trending } from "@/types/post";

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

async function loadAllTrending(): Promise<Trending[]> {
  const files = await listCollected().catch(() => []);
  const trendingFiles = files.filter((f) => f.name.startsWith("trending-") && !f.name.startsWith("trending-raw"));
  if (trendingFiles.length === 0) return [];

  const byGenre = new Map<string, Post[]>();
  for (const f of trendingFiles) {
    const posts = await readCollectedJson<Post[]>(f.name).catch(() => null);
    if (!posts || posts.length === 0) continue;
    for (const p of posts) {
      const tag = p.source_hashtag;
      if (!tag) continue;
      const genre = findGenreByHashtag(tag);
      if (!genre) continue;
      const list = byGenre.get(genre.name) ?? [];
      list.push(p);
      byGenre.set(genre.name, list);
    }
  }

  const all: Trending[] = [];
  for (const [genre, posts] of byGenre) {
    all.push(...computeTrending(posts, genre));
  }
  return all.sort((a, b) => b.trend_score - a.trend_score);
}
