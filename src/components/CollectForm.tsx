"use client";

import { useMemo, useState } from "react";

import type { Genre } from "@/config/genres";

type CollectMode = "hashtag" | "discover";

interface SeedState {
  seed: string;
  status: "idle" | "loading" | "ok" | "error";
  count?: number;
  error?: string;
}

interface CollectFormProps {
  genres: Genre[];
}

/** Records fetched per hashtag-discovery input (post-paid cost control). */
const HASHTAG_NUM_OF_POSTS = 20;

/**
 * Hashtag discovery is dormant: the 2026-08-24 smoke test showed neither
 * general dataset supports it (scripts/smoke-hashtag.mjs header). Flip this
 * once a dedicated hashtag scraper id is set in BRIGHT_DATA_DATASET_HASHTAG.
 */
const HASHTAG_MODE_AVAILABLE = false;

export function CollectForm({ genres }: CollectFormProps) {
  const [genreName, setGenreName] = useState(genres[0]?.name ?? "");
  const genre = useMemo(
    () => genres.find((g) => g.name === genreName) ?? genres[0],
    [genres, genreName],
  );
  const [mode, setMode] = useState<CollectMode>("discover");
  const [seedStates, setSeedStates] = useState<SeedState[]>([]);
  const [running, setRunning] = useState(false);

  const seeds = useMemo(() => {
    if (!genre) return [];
    return mode === "hashtag"
      ? genre.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`))
      : genre.accounts.map((a) => `@${a}`);
  }, [genre, mode]);

  async function runBatch() {
    if (!genre || running || seeds.length === 0) return;
    setRunning(true);
    setSeedStates(seeds.map((seed) => ({ seed, status: "loading" })));

    await Promise.all(
      seeds.map(async (seed, i) => {
        try {
          const res = await fetch("/api/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: mode,
              target: seed.replace(/^[#@]/, ""),
              genre: genre.name,
              numOfPosts: mode === "hashtag" ? HASHTAG_NUM_OF_POSTS : 50,
            }),
          });
          const data = (await res.json()) as
            | { ok: true; count: number; file: string }
            | { ok: false; error: string };
          setSeedStates((prev) => {
            const next = [...prev];
            if (res.ok && data.ok) {
              next[i] = { seed, status: "ok", count: data.count };
            } else {
              next[i] = {
                seed,
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
              seed,
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
        <div
          className="flex overflow-hidden rounded-full border border-[var(--color-accent-soft)] text-xs"
          role="group"
          aria-label="収集モード"
        >
          <ModeButton
            active={mode === "hashtag"}
            disabled={running || !HASHTAG_MODE_AVAILABLE}
            title={
              HASHTAG_MODE_AVAILABLE
                ? undefined
                : "現在の Bright Data 購読ではハッシュタグ discovery が利用できません（実測済み）"
            }
            onClick={() => {
              setMode("hashtag");
              setSeedStates([]);
            }}
          >
            # ハッシュタグ横断
          </ModeButton>
          <ModeButton
            active={mode === "discover"}
            disabled={running}
            onClick={() => {
              setMode("discover");
              setSeedStates([]);
            }}
          >
            @ アカウント
          </ModeButton>
        </div>
        <button
          type="button"
          onClick={runBatch}
          disabled={running || seeds.length === 0}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running
            ? "取得中…"
            : `${seeds.length} ${mode === "hashtag" ? "タグ" : "アカウント"} 一括取得`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {seeds.map((s) => (
          <span
            key={s}
            className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-mono"
          >
            {s}
          </span>
        ))}
        {seeds.length === 0 && (
          <span className="text-xs text-[var(--color-muted)]">
            このジャンルには{mode === "hashtag" ? "ハッシュタグ" : "アカウント"}
            が登録されていません（src/config/genres.ts で追加）。
          </span>
        )}
      </div>

      {seedStates.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-[var(--color-accent-soft)] bg-white p-3 text-sm">
          {seedStates.map((s) => (
            <li key={s.seed} className="space-y-1 py-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs">{s.seed}</span>
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
        ⚠ Bright Data は<strong>後課金</strong>。ハッシュタグ横断は 1 タグ ={" "}
        {HASHTAG_NUM_OF_POSTS} 投稿上限、アカウントは 1 件 ≈ 12
        投稿。実行前に件数×単価を確認してください。`/trending`
        でジャンル横断の推定トレンドを確認できます。
      </p>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "bg-[var(--color-accent)] text-white"
          : "bg-white text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)]"
      }`}
    >
      {children}
    </button>
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
