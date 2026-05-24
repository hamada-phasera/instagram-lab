import { CollectForm } from "@/components/CollectForm";
import { TARGET_ACCOUNTS } from "@/config/accounts";
import { TARGET_HASHTAGS } from "@/config/hashtags";
import { loadMockPosts } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

interface CollectedFileEntry {
  name: string;
  type: string;
  bytes: number;
  mtime: string;
}

async function fetchCollectedFiles(): Promise<CollectedFileEntry[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5050";
    const res = await fetch(`${base}/api/collect`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok: boolean; files?: CollectedFileEntry[] };
    return data.files ?? [];
  } catch {
    return [];
  }
}

export default async function CollectPage() {
  const [mockPosts, collected] = await Promise.all([
    loadMockPosts(),
    fetchCollectedFiles(),
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
              <li key={f.name} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs">{f.name}</span>
                <span className="text-xs text-[var(--color-muted)]">
                  {f.type} · {formatBytes(f.bytes)} · {f.mtime.slice(0, 16).replace("T", " ")}
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
