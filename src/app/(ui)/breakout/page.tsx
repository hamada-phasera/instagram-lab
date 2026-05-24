import { PostCard } from "@/components/PostCard";
import { loadMockPosts } from "@/lib/fixtures";
import { scoreAll } from "@/lib/scoring";

export default async function BreakoutPage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const { only } = await searchParams;
  const filterBreakoutOnly = only === "1";

  const posts = await loadMockPosts();
  const scored = scoreAll(posts);
  const breakouts = scored.filter((s) => s.is_breakout);
  const list = filterBreakoutOnly ? breakouts : scored;
  const sorted = [...list].sort(
    (a, b) => (b.view_ratio ?? 0) - (a.view_ratio ?? 0)
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-bold">② ブレイク検出</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            <code>view_ratio &gt;= 3.0</code> または <code>engagement_jump &gt;= 2.0</code> をブレイク候補としています。
            「バズった」ではなく <strong>フォロワー外露出の代理指標</strong> であることに注意。
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <FilterLink href="/breakout" active={!filterBreakoutOnly}>
            全て {scored.length}
          </FilterLink>
          <FilterLink href="/breakout?only=1" active={filterBreakoutOnly}>
            ブレイク候補のみ {breakouts.length}
          </FilterLink>
        </div>
      </header>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-accent-soft)] p-8 text-center text-[var(--color-muted)]">
          該当する投稿がありません。
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <PostCard key={p.post_url} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-full px-4 py-1.5 transition ${
        active
          ? "bg-[var(--color-fg)] text-white"
          : "border border-[var(--color-accent-soft)] text-[var(--color-muted)] hover:border-[var(--color-fg)]"
      }`}
    >
      {children}
    </a>
  );
}
