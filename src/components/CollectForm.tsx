"use client";

import { useState, useTransition } from "react";

type CollectKind = "posts" | "reels" | "comments" | "hashtag";

type CollectResult =
  | { kind: "idle" }
  | { kind: "loading"; type: CollectKind; target: string }
  | { kind: "ok"; type: CollectKind; target: string; count: number; file: string }
  | { kind: "error"; type: CollectKind; target: string; status: number; message: string };

interface CollectFormProps {
  accounts: { username: string; isOwn?: boolean }[];
  hashtags: string[];
}

export function CollectForm({ accounts, hashtags }: CollectFormProps) {
  const [account, setAccount] = useState(accounts[0]?.username ?? "");
  const [hashtag, setHashtag] = useState(hashtags[0] ?? "");
  const [result, setResult] = useState<CollectResult>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const trigger = (type: CollectKind, target: string) => {
    setResult({ kind: "loading", type, target });
    startTransition(async () => {
      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, target }),
        });
        const data = (await res.json()) as
          | { ok: true; count: number; file: string }
          | { ok: false; error: string };
        if (res.ok && data.ok) {
          setResult({ kind: "ok", type, target, count: data.count, file: data.file });
        } else {
          setResult({
            kind: "error",
            type,
            target,
            status: res.status,
            message: data.ok ? "unknown" : data.error,
          });
        }
      } catch (err) {
        setResult({
          kind: "error",
          type,
          target,
          status: 0,
          message: err instanceof Error ? err.message : "network error",
        });
      }
    });
  };

  const busy = isPending || result.kind === "loading";

  return (
    <div className="space-y-6">
      <Row label="アカウント取得">
        <select
          className="rounded-lg border border-[var(--color-accent-soft)] bg-white px-3 py-1.5 text-sm"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          disabled={busy}
        >
          {accounts.map((a) => (
            <option key={a.username} value={a.username}>
              @{a.username}
              {a.isOwn ? " (自社)" : ""}
            </option>
          ))}
        </select>
        <Trigger label="Posts 取得" onClick={() => trigger("posts", account)} busy={busy} />
        <Trigger label="Reels 取得" onClick={() => trigger("reels", account)} busy={busy} />
        <Trigger
          label="コメント取得"
          onClick={() => trigger("comments", account)}
          busy={busy}
          tone="ghost"
        />
      </Row>

      <Row label="ハッシュタグ取得">
        <select
          className="rounded-lg border border-[var(--color-accent-soft)] bg-white px-3 py-1.5 text-sm"
          value={hashtag}
          onChange={(e) => setHashtag(e.target.value)}
          disabled={busy}
        >
          {hashtags.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <Trigger label="Hashtag 取得" onClick={() => trigger("hashtag", hashtag)} busy={busy} />
      </Row>

      <ResultPanel result={result} />

      <p className="text-xs text-[var(--color-muted)]">
        ⚠ Bright Data は<strong>後課金</strong>。ボタン1押下ごとにクレジットが消費されます。
        ENV 未設定時は 503 が返って空振りします（安全）。
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="display w-32 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Trigger({
  label,
  onClick,
  busy,
  tone = "primary",
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  tone?: "primary" | "ghost";
}) {
  const base = "rounded-full px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    tone === "primary"
      ? "bg-[var(--color-accent)] text-white hover:opacity-90"
      : "border border-[var(--color-accent-soft)] text-[var(--color-fg)] hover:border-[var(--color-accent)]";
  return (
    <button type="button" disabled={busy} onClick={onClick} className={`${base} ${styles}`}>
      {label}
    </button>
  );
}

function ResultPanel({ result }: { result: CollectResult }) {
  if (result.kind === "idle") return null;
  if (result.kind === "loading") {
    return (
      <Box tone="info">
        <strong>取得中…</strong> {result.type} / target={result.target}
      </Box>
    );
  }
  if (result.kind === "ok") {
    return (
      <Box tone="ok">
        <strong>取得成功</strong> · {result.count} 件 · type={result.type} · target={result.target}
        <div className="mt-1 break-all font-mono text-xs text-[var(--color-muted)]">{result.file}</div>
      </Box>
    );
  }
  return (
    <Box tone="err">
      <strong>エラー HTTP {result.status}</strong> · type={result.type} · target={result.target}
      <div className="mt-1 text-xs text-[var(--color-muted)]">{result.message}</div>
      {result.status === 503 && (
        <div className="mt-2 text-xs">
          <code>.env.local</code> に <code>BRIGHT_DATA_API_KEY</code> と該当 <code>DATASET_*</code> を設定し、dev サーバを再起動してください。
        </div>
      )}
    </Box>
  );
}

function Box({ tone, children }: { tone: "info" | "ok" | "err"; children: React.ReactNode }) {
  const styles = {
    info: "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/40",
    ok: "border-emerald-300 bg-emerald-50",
    err: "border-red-300 bg-red-50",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 text-sm ${styles}`}>{children}</div>
  );
}
