import Link from "next/link";

const tabs = [
  {
    href: "/collect",
    label: "① 収集",
    desc: "ジャンル（ハッシュタグ群）を選んで Bright Data 一括取得",
  },
  {
    href: "/trending",
    label: "② トレンド",
    desc: "EPH × reach × ハッシュタグ内順位 で推定トレンド一覧",
  },
  {
    href: "/catalog",
    label: "③ 型カタログ",
    desc: "フック型 × ビジュアル型 の再現レシピ",
  },
  // 「④ 声分析」はコメント本文の取得元が未接続のため一旦非表示（TabNav と揃える）。
  // {
  //   href: "/voice",
  //   label: "④ 声分析",
  //   desc: "コメント本文から顕在ニーズ・潜在欲求[要検証]",
  // },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
          instagram-lab
        </p>
        <h1 className="display mt-2 text-4xl font-bold sm:text-5xl">
          Trend Discovery
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--color-muted)]">
          ジャンル別に Instagram のハッシュタグを横断し、いま伸びている投稿を発見します。
          サムネクリックで実物を見ながら、惹かれた投稿を型分解・声分析で深掘りできます。
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
        ⚠ トレンドスコアは EPH / reach / 順位の代理指標による「推定」です。確定的なバズ判定ではありません。
      </footer>
    </main>
  );
}
