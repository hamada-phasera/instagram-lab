"use client";

import { useMemo, useState } from "react";

import type { Genre } from "@/config/genres";

type CollectKind = "hashtag";

interface TagState {
  hashtag: string;
  status: "idle" | "loading" | "ok" | "error";
  count?: number;
  error?: string;
}

interface CollectFormProps {
  genres: Genre[];
}

export function CollectForm({ genres }: CollectFormProps) {
  const [genreName, setGenreName] = useState(genres[0]?.name ?? "");
  const genre = useMemo(
    () => genres.find((g) => g.name === genreName) ?? genres[0],
    [genres, genreName],
  );
  const [tagStates, setTagStates] = useState<TagState[]>([]);
  const [running, setRunning] = useState(false);

  async function runBatch() {
    if (!genre || running) return;
    setRunning(true);
    const initial: TagState[] = genre.hashtags.map((h) => ({ hashtag: h, status: "loading" }));
    setTagStates(initial);

    await Promise.all(
      genre.hashtags.map(async (tag, i) => {
        try {
          const res = await fetch("/api/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "hashtag" as CollectKind,
              target: tag,
              genre: genre.name,
            }),
          });
          const data = (await res.json()) as
            | { ok: true; count: number; file: string }
            | { ok: false; error: string };
          setTagStates((prev) => {
            const next = [...prev];
            if (res.ok && data.ok) {
              next[i] = { hashtag: tag, status: "ok", count: data.count };
            } else {
              next[i] = {
                hashtag: tag,
                status: "error",
                error: data.ok ? `HTTP ${res.status}` : data.error,
              };
            }
            return next;
          });
        } catch (err) {
          setTagStates((prev) => {
            const next = [...prev];
            next[i] = {
              hashtag: tag,
              status: "error",
              error: err instanceof Error ? err.message : "network error",
            };
            return next;
          });
        }
      }),
    );

    setRunning(false);
  }

  const totalEstimate = (genre?.hashtags.length ?? 0) * 0.02;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="display text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          ジャンル
        </label>
        <select
          className="rounded-lg border border-[var(--color-accent-soft)] bg-white px-3 py-1.5 text-sm"
          value={genreName}
          onChange={(e) => {
            setGenreName(e.target.value);
            setTagStates([]);
          }}
          disabled={running}
        >
          {genres.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name}
              {g.note ? ` — ${g.note}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runBatch}
          disabled={running || !genre}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "取得中…" : `${genre?.hashtags.length ?? 0} タグ 一括取得`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {genre?.hashtags.map((h) => (
          <span
            key={h}
            className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs"
          >
            {h}
          </span>
        ))}
      </div>

      {tagStates.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-[var(--color-accent-soft)] bg-white p-3 text-sm">
          {tagStates.map((s) => (
            <li key={s.hashtag} className="flex items-center justify-between gap-3 py-1">
              <span className="font-mono text-xs">{s.hashtag}</span>
              <StatusBadge state={s} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        ⚠ Bright Data は<strong>後課金</strong>。1 ジャンル一括 ≈ ${totalEstimate.toFixed(2)} USD
        相当の credit を消費（概算）。`/trending` でジャンル横断トレンドを確認できます。
      </p>
    </div>
  );
}

function StatusBadge({ state }: { state: TagState }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs">
        取得中…
      </span>
    );
  }
  if (state.status === "ok") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
        ✓ {state.count} 件
      </span>
    );
  }
  return (
    <span
      className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800"
      title={state.error}
    >
      ✕ {state.error?.slice(0, 40) ?? "error"}
    </span>
  );
}
