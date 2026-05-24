"use client";

import { useState, useTransition } from "react";

import type { Scored } from "@/types/post";

type Weight = "高" | "中" | "低";
type Sentiment = "ポジ" | "ネガ" | "中立";
type Confidence = "高" | "中" | "低";

type VoiceAnalysis = {
  surface_needs: Array<{
    category: string;
    weight: Weight;
    sentiment: Sentiment;
    examples: string[];
  }>;
  latent_desires: Array<{
    hypothesis: string;
    evidence: string;
    confidence: Confidence;
  }>;
  content_implications: string[];
};

type AnalysisState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: VoiceAnalysis }
  | { kind: "error"; status: number; message: string };

interface VoiceAnalyzerProps {
  posts: Scored[];
}

export function VoiceAnalyzer({ posts }: VoiceAnalyzerProps) {
  const [results, setResults] = useState<Record<string, AnalysisState>>({});
  const [isPending, startTransition] = useTransition();

  const analyze = (post: Scored) => {
    const comments = post.comment_texts ?? [];
    if (comments.length === 0) return;
    setResults((prev) => ({ ...prev, [post.post_url]: { kind: "loading" } }));
    startTransition(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "voice",
            payload: { comments },
          }),
        });
        const data = (await res.json()) as
          | { ok: true; data: VoiceAnalysis }
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

  return (
    <ul className="space-y-4">
      {posts.map((p) => {
        const r = results[p.post_url] ?? { kind: "idle" };
        const commentCount = p.comment_texts?.length ?? 0;
        return (
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
              <div className="flex-1 min-w-0">
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
                    コメント ({commentCount})
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

              <button
                type="button"
                onClick={() => analyze(p)}
                disabled={
                  commentCount === 0 || isPending || r.kind === "loading"
                }
                className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                title={commentCount === 0 ? "コメント本文が未取得です" : undefined}
              >
                {r.kind === "loading" ? "分析中…" : r.kind === "ok" ? "再分析" : "コメント分析"}
              </button>
            </div>

            {r.kind === "ok" && <VoiceResult data={r.data} />}
            {r.kind === "error" && <ErrorBox status={r.status} message={r.message} />}
          </li>
        );
      })}
    </ul>
  );
}

function VoiceResult({ data }: { data: VoiceAnalysis }) {
  return (
    <div className="mt-4 space-y-4 rounded-lg bg-[var(--color-accent-soft)]/30 p-4 text-xs">
      <Section title="顕在ニーズ">
        {data.surface_needs.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {data.surface_needs.map((n, i) => (
              <li key={i} className="rounded-md bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{n.category}</strong>
                  <Pill tone={pillToneForWeight(n.weight)}>weight: {n.weight}</Pill>
                  <Pill tone={pillToneForSentiment(n.sentiment)}>{n.sentiment}</Pill>
                </div>
                {n.examples.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-[var(--color-muted)]">
                    {n.examples.map((ex, j) => (
                      <li key={j}>{ex}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={
          <>
            潜在欲求
            <span className="ml-2 rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-normal">
              要検証
            </span>
          </>
        }
      >
        {data.latent_desires.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {data.latent_desires.map((d, i) => (
              <li key={i} className="rounded-md bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{d.hypothesis}</strong>
                  <Pill tone={pillToneForWeight(d.confidence)}>confidence: {d.confidence}</Pill>
                </div>
                <p className="mt-1 text-[var(--color-muted)]">根拠: {d.evidence}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="投稿への示唆">
        {data.content_implications.length === 0 ? (
          <Empty />
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {data.content_implications.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="display text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-[var(--color-muted)]">該当なし</p>;
}

function Pill({
  tone,
  children,
}: {
  tone: "neutral" | "warm" | "good" | "bad";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-[var(--color-accent-soft)] text-[var(--color-fg)]",
    warm: "bg-amber-100 text-amber-800",
    good: "bg-emerald-100 text-emerald-800",
    bad: "bg-red-100 text-red-800",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles}`}>
      {children}
    </span>
  );
}

function pillToneForWeight(w: Weight | Confidence): "neutral" | "warm" | "good" {
  return w === "高" ? "warm" : w === "中" ? "neutral" : "good";
}

function pillToneForSentiment(s: Sentiment): "neutral" | "good" | "bad" {
  return s === "ポジ" ? "good" : s === "ネガ" ? "bad" : "neutral";
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
