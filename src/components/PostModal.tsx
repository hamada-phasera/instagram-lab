"use client";

import { useEffect, useRef, useState } from "react";

import type { Trending } from "@/types/post";

interface PostModalProps {
  post: Trending | null;
  onClose: () => void;
}

export function PostModal({ post, onClose }: PostModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [embedFailed, setEmbedFailed] = useState(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (post && !dlg.open) {
      dlg.showModal();
      setEmbedFailed(false);
    } else if (!post && dlg.open) {
      dlg.close();
    }
  }, [post]);

  if (!post) return null;

  const embedSrc = `${post.post_url.replace(/\/?$/, "/")}embed/`;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-2xl"
    >
      <div className="flex items-baseline justify-between border-b border-[var(--color-accent-soft)] px-5 py-3">
        <div>
          <p className="display text-base font-bold">@{post.account}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {post.genre} · {post.source_hashtags.join(" ")} · {post.date}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="rounded-full px-3 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)]"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 p-5 md:flex-row">
        <div className="flex-1 overflow-hidden rounded-xl bg-black">
          {embedFailed ? (
            <FallbackThumbnail post={post} />
          ) : (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={`Instagram post by ${post.account}`}
              allowFullScreen
              loading="lazy"
              onError={() => setEmbedFailed(true)}
              className="aspect-[9/16] w-full bg-black"
            />
          )}
        </div>

        <aside className="flex w-full flex-col gap-3 md:w-64">
          <Stat label="trend_score" value={post.trend_score.toFixed(3)} highlight />
          <Stat label="EPH (engage/h)" value={post.eph.toFixed(1)} />
          <Stat label="reach_proxy" value={post.reach_proxy.toFixed(2)} />
          <Stat
            label="hashtag 内順位"
            value={Number.isFinite(post.hashtag_top_rank) ? `#${post.hashtag_top_rank}` : "—"}
          />
          <Stat label="likes" value={post.likes.toLocaleString()} />
          <Stat label="comments" value={post.comments.toLocaleString()} />
          {typeof post.views === "number" && (
            <Stat label="views" value={post.views.toLocaleString()} />
          )}
          <a
            href={post.post_url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-center text-xs text-white hover:opacity-90"
          >
            Instagram で開く →
          </a>
          <p className="text-[10px] leading-snug text-[var(--color-muted)]">
            * trend_score は推定指標。views/followers と (likes+comments)/時間 +
            ハッシュタグ内順位を合成。確定的なバズではありません。
          </p>
        </aside>
      </div>
    </dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        highlight ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-accent-soft)]"
      }`}
    >
      <p className="text-[10px] opacity-80">{label}</p>
      <p className="display text-base font-bold">{value}</p>
    </div>
  );
}

function FallbackThumbnail({ post }: { post: Trending }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.thumbnail_url}
        alt=""
        className="w-full max-w-sm rounded-lg object-cover"
      />
      <p className="text-xs opacity-80">
        埋め込み表示に失敗しました（非公開化 / 削除 / ネットワーク制限の可能性）。
        下のリンクから Instagram 本体でご覧ください。
      </p>
    </div>
  );
}
