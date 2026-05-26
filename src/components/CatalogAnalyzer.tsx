"use client";

import { useMemo, useState, useTransition } from "react";

import type { Trending } from "@/types/post";

type CatalogAnalysis = {
  hook_type: string;
  visual_type: string;
  why_stops_scroll: string;
  brand_translation: string;
};

type AnalysisState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CatalogAnalysis }
  | { kind: "error"; status: number; message: string };

interface CatalogAnalyzerProps {
  candidates: Trending[];
  hookTypes: readonly string[];
  visualTypes: readonly string[];
  brandName: string;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

export function CatalogAnalyzer({
  candidates,
  hookTypes,
  visualTypes,
  brandName,
}: CatalogAnalyzerProps) {
  const [results, setResults] = useState<Record<string, AnalysisState>>({});
  const [isPending, startTransition] = useTransition();

  const analyze = (post: Trending) => {
    setResults((prev) => ({ ...prev, [post.post_url]: { kind: "loading" } }));
    startTransition(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "catalog",
            payload: {
              caption: post.caption,
              thumbnailUrl: post.thumbnail_url,
              brandName,
            },
          }),
        });
        const data = (await res.json()) as
          | { ok: true; data: CatalogAnalysis }
          | { ok: false; error: string };
        if (res.ok && data.ok) {
          setResults((prev) => ({
            ...prev,
            [post.post_url]: { kind: "ok", data: data.data },
          }));
        } else {
          setResults((prev) => ({
            ...prev,
            [post.post_url]: {
              kind: "error",
              status: res.status,
              message: data.ok ? "unknown" : data.error,
            },
          }));
        }
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [post.post_url]: {
            kind: "error",
            status: 0,
            message: err instanceof Error ? err.message : "network error",
          },
        }));
      }
    });
  };

  // post_url -> {hook, visual} index for matrix cell lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, Trending[]>();
    for (const c of candidates) {
      const r = results[c.post_url];
      if (r?.kind !== "ok") continue;
      const key = `${r.data.hook_type}|${r.data.visual_type}`;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [candidates, results]);

  const analyzedCount = Object.values(results).filter((r) => r.kind === "ok").length;
  const errorCount = Object.values(results).filter((r) => r.kind === "error").length;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="display text-lg font-bold">マトリクス（分析後に埋まる）</h2>
          <span className="text-xs text-[var(--color-muted)]">
            分析済 {analyzedCount} / {candidates.length}
            {errorCount > 0 && <span className="ml-2 text-red-700">エラー {errorCount}</span>}
          </span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-accent-soft)] bg-white">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="display sticky left-0 z-10 bg-white px-3 py-3 text-left text-sm font-bold">
                  フック型 ＼ ビジュアル型
                </th>
                {visualTypes.map((v) => (
                  <th key={v} className="px-3 py-3 text-center font-normal text-[var(--color-muted)]">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hookTypes.map((h) => (
                <tr key={h} className="border-t border-[var(--color-accent-soft)]">
                  <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left text-sm font-medium">
                    {h}
                  </th>
                  {visualTypes.map((v) => {
                    const hits = cellMap.get(`${h}|${v}`) ?? [];
                    return (
                      <td key={v} className="border-l border-[var(--color-accent-soft)] px-2 py-2 text-center">
                        {hits.length === 0 ? (
                          <div className="h-12 w-full rounded-lg border border-dashed border-[var(--color-accent-soft)]" />
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {hits.map((hit) => (
                              <a
                                key={hit.post_url}
                                href={hit.post_url}
                                target="_blank"
                                rel="noreferrer noopener"
                                title={hit.caption}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={hit.thumbnail_url}
                                  alt=""
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display text-lg font-bold">対象トレンド上位 ({candidates.length})</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          各カードの「分析」ボタンで <code>/api/analyze?mode=catalog</code> を呼び、Claude (vision) が
          hook_type / visual_type / なぜ視線が止まるか / {brandName} 翻訳案 を返します。
        </p>
        <ul className="mt-4 space-y-3">
          {candidates.map((c) => {
            const r = results[c.post_url] ?? { kind: "idle" };
            return (
              <li
                key={c.post_url}
                className="rounded-xl border border-[var(--color-accent-soft)] bg-white p-3"
              >
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnail_url}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--color-muted)]">@{c.account}</div>
                    <div className="line-clamp-1 text-sm">{c.caption}</div>
                  </div>
                  <div className="display text-sm font-bold whitespace-nowrap" title="trend_score">
                    {fmt(c.trend_score)}
                  </div>
                  <button
                    type="button"
                    onClick={() => analyze(c)}
                    disabled={isPending || r.kind === "loading"}
                    className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                  >
                    {r.kind === "loading" ? "分析中…" : r.kind === "ok" ? "再分析" : "分析"}
                  </button>
                </div>
                {r.kind === "ok" && <CatalogResult data={r.data} />}
                {r.kind === "error" && <ErrorBox status={r.status} message={r.message} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function CatalogResult({ data }: { data: CatalogAnalysis }) {
  return (
    <div className="mt-3 grid gap-3 rounded-lg bg-[var(--color-accent-soft)]/30 p-3 text-xs sm:grid-cols-2">
      <Field label="hook_type" value={data.hook_type} />
      <Field label="visual_type" value={data.visual_type} />
      <div className="sm:col-span-2">
        <Field label="why_stops_scroll" value={data.why_stops_scroll} multiline />
      </div>
      <div className="sm:col-span-2">
        <Field label="brand_translation" value={data.brand_translation} multiline emphasis />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
  emphasis,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </div>
      <div
        className={`mt-0.5 ${multiline ? "" : "truncate"} ${
          emphasis ? "font-medium text-[var(--color-accent)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ErrorBox({ status, message }: { status: number; message: string }) {
  return (
    <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs">
      <strong>エラー HTTP {status}</strong>
      <div className="mt-1 text-[var(--color-muted)]">{message}</div>
      {status === 503 && (
        <div className="mt-2">
          <code>.env.local</code> に <code>ANTHROPIC_API_KEY</code> を設定し、dev サーバを再起動してください。
        </div>
      )}
    </div>
  );
}
