import { loadMockPosts } from "@/lib/fixtures";
import { scoreAll } from "@/lib/scoring";
import { HOOK_TYPES, VISUAL_TYPES } from "@/lib/taxonomy";

export default async function CatalogPage() {
  const posts = await loadMockPosts();
  const scored = scoreAll(posts);
  const breakouts = scored.filter((s) => s.is_breakout);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">③ 型カタログ</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          フック型 × ビジュアル型のマトリクス。各セルは
          <code className="mx-1">/api/analyze?mode=catalog</code>
          で Claude(vision) が分類します。MVP は枠のみ（実分析は後課金APIなので手動トリガ）。
        </p>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-[var(--color-accent-soft)] bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="display sticky left-0 z-10 bg-white px-3 py-3 text-left text-sm font-bold">
                フック型 ＼ ビジュアル型
              </th>
              {VISUAL_TYPES.map((v) => (
                <th key={v} className="px-3 py-3 text-center font-normal text-[var(--color-muted)]">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOOK_TYPES.map((h) => (
              <tr key={h} className="border-t border-[var(--color-accent-soft)]">
                <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left text-sm font-medium">
                  {h}
                </th>
                {VISUAL_TYPES.map((v) => (
                  <td key={v} className="border-l border-[var(--color-accent-soft)] px-3 py-3 text-center">
                    <button
                      type="button"
                      className="h-10 w-full rounded-lg border border-dashed border-[var(--color-accent-soft)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      title={`${h} × ${v} — クリックでサンプル投稿を開く（未実装）`}
                    >
                      ＋
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="display text-lg font-bold">対象ブレイク候補 ({breakouts.length})</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          以下の投稿が分析対象（is_breakout = true）。各カードを Claude に投げて hook/visual を分類する想定です。
        </p>
        <ul className="mt-4 space-y-3">
          {breakouts.map((b) => (
            <li
              key={b.post_url}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-accent-soft)] bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.thumbnail_url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="text-xs text-[var(--color-muted)]">@{b.account}</div>
                <div className="line-clamp-1 text-sm">{b.caption}</div>
              </div>
              <div className="display text-sm font-bold">
                {b.view_ratio ? `${b.view_ratio.toFixed(1)}×` : "—"}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
