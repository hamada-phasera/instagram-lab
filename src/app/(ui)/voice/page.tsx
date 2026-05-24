import { loadMockPosts } from "@/lib/fixtures";
import { scoreAll } from "@/lib/scoring";

export default async function VoicePage() {
  const posts = await loadMockPosts();
  const scored = scoreAll(posts);
  const withComments = scored.filter(
    (s) => s.comment_texts && s.comment_texts.length > 0
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display text-3xl font-bold">④ 声分析</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          ブレイク候補のコメント本文を Claude に投げ、顕在ニーズ・潜在欲求<span className="ml-1 rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px]">要検証</span>・投稿への示唆を抽出します。
          実分析は <code>POST /api/analyze</code> with <code>{`{ mode: "voice" }`}</code>（手動トリガ）。
        </p>
      </header>

      {withComments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-accent-soft)] p-8 text-center text-[var(--color-muted)]">
          コメント本文付きの投稿がフィクスチャにありません。
          Bright Data の comments エンドポイントで取得後に表示されます。
        </p>
      ) : (
        <ul className="space-y-4">
          {withComments.map((p) => (
            <li
              key={p.post_url}
              className="rounded-2xl border border-[var(--color-accent-soft)] bg-white p-5"
            >
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnail_url}
                  alt=""
                  className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>@{p.account}</span>
                    <span>·</span>
                    <span>{p.date}</span>
                    {p.is_breakout && (
                      <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                        ブレイク候補
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{p.caption}</p>
                  <div className="mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                      コメント ({p.comment_texts?.length ?? 0})
                    </div>
                    <ul className="mt-1 space-y-1">
                      {p.comment_texts?.slice(0, 5).map((c, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-[var(--color-accent-soft)]/40 px-2 py-1 text-xs"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
