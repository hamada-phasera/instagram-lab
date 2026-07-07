"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/collect", label: "① 収集" },
  { href: "/trending", label: "② トレンド" },
  { href: "/catalog", label: "③ 型カタログ" },
  // 「④ 声」は discover-by-url データセットがコメント本文を返さないため一旦非表示。
  // コメント用データセット購読後に復活させる（route は /voice に温存）。
  // { href: "/voice", label: "④ 声" },
];

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--color-accent-soft)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-3">
        <Link
          href="/"
          className="display mr-4 text-sm font-bold tracking-wide text-[var(--color-fg)] hover:text-[var(--color-accent)]"
        >
          instagram-lab
        </Link>
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                active
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-fg)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
