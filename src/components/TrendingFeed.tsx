"use client";

import { useMemo, useState } from "react";

import { PostModal } from "@/components/PostModal";
import { TrendingCard } from "@/components/TrendingCard";
import type { Trending } from "@/types/post";

type SortBy = "trend_score" | "eph" | "reach_proxy";

interface TrendingFeedProps {
  posts: Trending[];
  genres: string[];
}

export function TrendingFeed({ posts, genres }: TrendingFeedProps) {
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("trend_score");
  const [selected, setSelected] = useState<Trending | null>(null);

  const visible = useMemo(() => {
    const filtered = genreFilter === "all" ? posts : posts.filter((p) => p.genre === genreFilter);
    return [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [posts, genreFilter, sortBy]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <FilterGroup label="ジャンル">
          <FilterChip active={genreFilter === "all"} onClick={() => setGenreFilter("all")}>
            全て {posts.length}
          </FilterChip>
          {genres.map((g) => {
            const count = posts.filter((p) => p.genre === g).length;
            if (count === 0) return null;
            return (
              <FilterChip
                key={g}
                active={genreFilter === g}
                onClick={() => setGenreFilter(g)}
              >
                {g} {count}
              </FilterChip>
            );
          })}
        </FilterGroup>

        <FilterGroup label="ソート">
          <FilterChip active={sortBy === "trend_score"} onClick={() => setSortBy("trend_score")}>
            trend_score
          </FilterChip>
          <FilterChip active={sortBy === "eph"} onClick={() => setSortBy("eph")}>
            EPH
          </FilterChip>
          <FilterChip active={sortBy === "reach_proxy"} onClick={() => setSortBy("reach_proxy")}>
            reach
          </FilterChip>
        </FilterGroup>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-accent-soft)] p-8 text-center text-[var(--color-muted)]">
          該当する投稿がありません。<code>/collect</code> でジャンルを選んで取得してください。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <TrendingCard key={p.post_url} post={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      <PostModal post={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="display text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition ${
        active
          ? "bg-[var(--color-fg)] text-white"
          : "border border-[var(--color-accent-soft)] text-[var(--color-muted)] hover:border-[var(--color-fg)]"
      }`}
    >
      {children}
    </button>
  );
}
