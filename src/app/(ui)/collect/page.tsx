import { CollectForm } from "@/components/CollectForm";
import { TARGET_ACCOUNTS } from "@/config/accounts";
import { TARGET_HASHTAGS } from "@/config/hashtags";
import { loadMockPosts } from "@/lib/fixtures";
import { listCollected } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CollectPage() {
  const [mockPosts, collected] = await Promise.all([
    loadMockPosts(),
    listCollected().catch(() => []),
  ]);
  const hasBrightData = Boolean(process.env.BRIGHT_DATA_API_KEY);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">① 収集</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          対象アカウント・ハッシュタグから Bright Data API で投稿を取得します。
          MVP はモックフィクスチャ（{mockPosts.length} 件）でも動作確認できます。
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="display text-lg font-bold">取得トリガ</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              hasBrightData
                ? "bg-emerald-100 text-emerald-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {hasBrightData ? "Bright Data 接続 OK" : "Bright Data 未接続 (503)"}
          </span>
        </div>
        <CollectForm accounts={TARGET_ACCOUNTS} hashtags={TARGET_HASHTAGS} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="対象アカウント (config)" items={TARGET_ACCOUNTS.map((a) => `@${a.username}${a.isOwn ? " ★" : ""}`)} />
        <Card title="対象ハッシュタグ (config)" items={TARGET_HASHTAGS} />
      </section>

      <section className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6">
        <h2 className="display text-lg font-bold">取得済みファイル</h2>
        {collected.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            まだ取得していません。上のボタンを押して取得してください。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-accent-soft)] text-sm">
            {collected.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2">
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-xs text-[var(--color-accent)] hover:underline"
                  >
                    {f.name}
                  </a>
                ) : (
                  <span className="font-mono text-xs">{f.name}</span>
                )}
                <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {kindOf(f.name)} · {formatBytes(f.bytes)} · {f.mtime.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function kindOf(name: string): string {
  return name.split("-")[0] ?? "?";
}
