import type { Scored } from "@/types/post";

export function PostCard({ post }: { post: Scored }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--color-accent-soft)] bg-white">
      <div className="relative aspect-square bg-[var(--color-accent-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {post.is_breakout && (
          <div className="absolute left-3 top-3 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-white">
            ブレイク候補（推定）
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
          {post.type}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2 text-xs text-[var(--color-muted)]">
          <span className="font-medium">@{post.account}</span>
          <span>{post.date}</span>
        </div>

        <p className="mt-2 line-clamp-3 text-sm text-[var(--color-fg)]">{post.caption}</p>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Metric label="view_ratio" value={fmt(post.view_ratio)} />
          <Metric label="engage_jump" value={fmt(post.engagement_jump)} />
          <Metric label="likes" value={post.likes.toLocaleString()} />
        </dl>

        <a
          href={post.post_url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-block text-xs text-[var(--color-accent)] hover:underline"
        >
          Instagram で開く →
        </a>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-accent-soft)] px-2 py-1.5">
      <dt className="text-[10px] text-[var(--color-muted)]">{label}</dt>
      <dd className="display text-sm font-bold">{value}</dd>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toFixed(2);
}
