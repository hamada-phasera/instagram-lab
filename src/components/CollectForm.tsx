"use client";

import { useMemo, useState } from "react";

import type { Genre } from "@/config/genres";

interface SeedState {
  account: string;
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
  const [seedStates, setSeedStates] = useState<SeedState[]>([]);
  const [running, setRunning] = useState(false);

  async function runBatch() {
    if (!genre || running) return;
    setRunning(true);
    const initial: SeedState[] = genre.accounts.map((a) => ({
      account: a,
      status: "loading",
    }));
    setSeedStates(initial);

    await Promise.all(
      genre.accounts.map(async (account, i) => {
        try {
          const res = await fetch("/api/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "discover",
              target: account,
              genre: genre.name,
              numOfPosts: 50,
            }),
          });
          const data = (await res.json()) as
            | { ok: true; count: number; file: string }
            | { ok: false; error: string };
          setSeedStates((prev) => {
            const next = [...prev];
            if (res.ok && data.ok) {
              next[i] = { account, status: "ok", count: data.count };
            } else {
              next[i] = {
                account,
                status: "error",
                error: data.ok ? `HTTP ${res.status}` : data.error,
              };
            }
            return next;
          });
        } catch (err) {
          setSeedStates((prev) => {
            const next = [...prev];
            next[i] = {
              account,
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

  const seedCount = genre?.accounts.length ?? 0;
  const totalEstimate = seedCount * 0.02;

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
            setSeedStates([]);
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
          {running ? "取得中…" : `${seedCount} アカウント 一括取得`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {genre?.accounts.map((a) => (
          <span
            key={a}
            className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-mono"
          >
            @{a}
          </span>
        ))}
      </div>

      {seedStates.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-[var(--color-accent-soft)] bg-white p-3 text-sm">
          {seedStates.map((s) => (
            <li key={s.account} className="space-y-1 py-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs">@{s.account}</span>
                <StatusBadge state={s} />
              </div>
              {s.status === "error" && s.error && (
                <pre className="ml-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-900">
                  {s.error}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        ⚠ Bright Data は<strong>後課金</strong>。1 ジャンル一括 ≈ ${totalEstimate.toFixed(2)} USD
        相当の credit を消費（概算、1 アカウント = 50 投稿想定）。`/trending` でジャンル横断の推定トレンドを確認できます。
      </p>
    </div>
  );
}

function StatusBadge({ state }: { state: SeedState }) {
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
      ✕ error
    </span>
  );
}
