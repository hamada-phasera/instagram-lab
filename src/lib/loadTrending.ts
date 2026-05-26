/**
 * Load all `trending-*.json` snapshots from storage and rank them
 * cross-genre via `computeTrending`. Used by /trending, /catalog, /voice.
 *
 * Each post in the persisted files carries `source_hashtag` injected by
 * `/api/collect`. We reverse-lookup the genre via `findGenreByHashtag`
 * and rank per-genre, then concatenate and sort by `trend_score` desc.
 */

import { findGenreByHashtag } from "@/config/genres";
import { listCollected, readCollectedJson } from "@/lib/storage";
import { computeTrending } from "@/lib/trending";
import type { Post, Trending } from "@/types/post";

export async function loadAllTrending(): Promise<Trending[]> {
  const files = await listCollected().catch(() => []);
  const trendingFiles = files.filter(
    (f) => f.name.startsWith("trending-") && !f.name.startsWith("trending-raw"),
  );
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
