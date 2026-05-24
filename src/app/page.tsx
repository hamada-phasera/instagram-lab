import Link from "next/link";

const tabs = [
  {
    href: "/collect",
    label: "① 収集",
    desc: "対象アカウント・ハッシュタグから Bright Data 取得",
  },
  {
    href: "/breakout",
    label: "② ブレイク検出",
    desc: "view_ratio / engagement_jump でブレイク候補を抽出",
  },
  {
    href: "/catalog",
    label: "③ 型カタログ",
    desc: "フック型 × ビジュアル型 の再現レシピ",
  },
  {
    href: "/voice",
    label: "④ 声分析",
    desc: "コメント本文から顕在ニーズ・潜在欲求[要検証]",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
          instagram-lab
        </p>
        <h1 className="display mt-2 text-4xl font-bold sm:text-5xl">
          Breakout Catalog
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--color-muted)]">
          Instagram の競合から「フォロワー数を遥かに超えてバズった投稿」だけを抽出し、
          なぜ通りすがりのユーザーの指が止まったかを再現可能な語彙に分解します。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-2xl border border-[var(--color-accent-soft)] bg-white p-6 transition hover:border-[var(--color-accent)]"
          >
            <div className="display text-xl font-bold">{t.label}</div>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{t.desc}</p>
            <div className="mt-4 text-sm text-[var(--color-accent)] opacity-0 transition group-hover:opacity-100">
              開く →
            </div>
          </Link>
        ))}
      </section>

      <footer className="mt-16 text-xs text-[var(--color-muted)]">
        ⚠ ブレイク判定は views/followers の代理指標による「推定」です。確定的な表現は避けてください。
      </footer>
    </main>
  );
}
