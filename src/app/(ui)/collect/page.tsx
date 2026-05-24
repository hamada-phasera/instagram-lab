import { loadMockPosts } from "@/lib/fixtures";

export default async function CollectPage() {
  const posts = await loadMockPosts();
  const accounts = Array.from(new Set(posts.map((p) => p.account)));
  const hashtags = Array.from(new Set(posts.flatMap((p) => p.hashtags)));
  const hasBrightData = Boolean(process.env.BRIGHT_DATA_API_KEY);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">① 収集</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          対象アカウント・ハッシュタグから Bright Data API で投稿を取得します。
          MVP はモックフィクスチャ（{posts.length} 件）で動作確認します。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="対象アカウント" items={accounts} />
        <Card title="対象ハッシュタグ" items={hashtags} />
      </section>

      <section className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6">
        <h2 className="display text-lg font-bold">取得状況</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="モック投稿数" value={String(posts.length)} />
          <Stat label="reel" value={String(posts.filter((p) => p.type === "reel").length)} />
          <Stat label="feed" value={String(posts.filter((p) => p.type === "feed").length)} />
          <Stat label="carousel" value={String(posts.filter((p) => p.type === "carousel").length)} />
        </dl>
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-accent-soft)] p-4 text-sm">
          {hasBrightData ? (
            <>
              <strong className="text-[var(--color-accent)]">Bright Data 接続OK。</strong>
              実取得は <code>POST /api/collect</code> を手動でトリガしてください（後課金API、自動実行禁止）。
            </>
          ) : (
            <>
              <strong>未接続。</strong> <code>.env.local</code> に
              <code className="mx-1">BRIGHT_DATA_API_KEY</code> と各 <code>DATASET_*</code> を設定すると有効化されます。
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6">
      <h2 className="display text-lg font-bold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((s) => (
          <li
            key={s}
            className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs text-[var(--color-fg)]"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-muted)]">{label}</dt>
      <dd className="display mt-1 text-2xl font-bold">{value}</dd>
    </div>
  );
}
