import { CollectForm } from "@/components/CollectForm";
import { GENRES } from "@/config/genres";
import { listCollected } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CollectPage() {
  const collected = await listCollected().catch(() => []);
  const hasBrightData = Boolean(process.env.BRIGHT_DATA_API_KEY);
  const hasDiscoverDataset = Boolean(process.env.BRIGHT_DATA_DATASET_DISCOVER);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">① 収集</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          ジャンルを選んで、その代表アカウント群の直近投稿を一括取得します。Bright Data の
          discover-by-url スクレイパで各 profile から N 投稿ずつ取り寄せ、
          <code>/trending</code> でジャンル横断の推定トレンドを表示します。
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display text-lg font-bold">ジャンル一括取得</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge ok={hasBrightData} okLabel="Bright Data 接続 OK" ngLabel="Bright Data 未接続" />
            <StatusBadge
              ok={hasDiscoverDataset}
              okLabel="DISCOVER dataset OK"
              ngLabel="DISCOVER dataset 未設定 (503)"
            />
          </div>
        </div>
        <CollectForm genres={GENRES} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GENRES.map((g) => (
          <article
            key={g.name}
            className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-5"
          >
            <h3 className="display text-base font-bold">{g.name}</h3>
            {g.note && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">{g.note}</p>
            )}
            <div className="mt-3 space-y-2">
              <ul className="flex flex-wrap gap-2">
                {g.accounts.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-mono"
                  >
                    @{a}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-[var(--color-muted)]">
                参考タグ: {g.hashtags.join(" ")}
              </p>
            </div>
          </article>
        ))}
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

function StatusBadge({ ok, okLabel, ngLabel }: { ok: boolean; okLabel: string; ngLabel: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {ok ? okLabel : ngLabel}
    </span>
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
