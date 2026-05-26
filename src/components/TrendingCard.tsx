"use client";

import { useState } from "react";

import type { Trending } from "@/types/post";

interface TrendingCardProps {
  post: Trending;
  onClick: () => void;
}

export function TrendingCard({ post, onClick }: TrendingCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-accent-soft)] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--color-accent-soft)]">
        {imgFailed ? (
          <ThumbPlaceholder post={post} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.thumbnail_url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        )}
        <div className="absolute left-3 top-3 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-white">
          score {post.trend_score.toFixed(2)}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
          {post.type}
        </div>
        {Number.isFinite(post.genre_rank) && post.genre_rank <= 10 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--color-fg)]">
            #{post.genre_rank} in {post.genre}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2 text-xs text-[var(--color-muted)]">
          <span className="truncate font-medium">@{post.account}</span>
          <span className="shrink-0">{post.date}</span>
        </div>

        <p className="line-clamp-2 text-xs text-[var(--color-fg)]">{post.caption}</p>

        <dl className="mt-auto grid grid-cols-3 gap-1 text-[10px]">
          <Metric label="EPH" value={fmt(post.eph)} />
          <Metric label="reach" value={fmt(post.reach_proxy)} />
          <Metric label="likes" value={short(post.likes)} />
        </dl>
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--color-accent-soft)] px-1.5 py-1">
      <dt className="text-[9px] text-[var(--color-muted)]">{label}</dt>
      <dd className="display text-xs font-bold">{value}</dd>
    </div>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return short(n);
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(2);
}

function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function ThumbPlaceholder({ post }: { post: Trending }) {
  const initial = (post.account ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--color-accent-soft)] to-white p-4 text-center">
      <div className="display flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-2xl font-bold text-white">
        {initial}
      </div>
      <p className="text-[10px] leading-snug text-[var(--color-muted)]">
        サムネ未取得<br />
        クリックで Instagram プレビュー
      </p>
    </div>
  );
}
