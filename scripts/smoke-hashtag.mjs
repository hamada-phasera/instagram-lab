#!/usr/bin/env node
/**
 * One-shot smoke test for Bright Data hashtag discovery (post-paid API).
 *
 * Verifies the wire format implemented in src/app/api/collect/route.ts
 * (`type=discover_new&discover_by=hashtag`, payload `{ input: [{ hashtag,
 * num_of_posts }] }`) with the smallest possible paid run, WITHOUT needing
 * the dev server. On a format mismatch Bright Data rejects the trigger with
 * a validation error before any scraping happens (= no charge), and this
 * script prints that error verbatim so the payload can be fixed.
 *
 * NEVER runs implicitly: requires --yes AND BRIGHT_DATA_API_KEY in
 * .env.local (or the environment). Per CLAUDE.md, a human runs this — CI
 * and tests must not.
 *
 * Usage:
 *   node scripts/smoke-hashtag.mjs --tag ブリトー --n 5 --yes
 *
 * Output: data/hashtag-smoke-<timestamp>.json (raw snapshot). The console
 * prints record count and per-record field names only — never captions or
 * comment bodies (PII rule in CLAUDE.md).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const TRIGGER = "https://api.brightdata.com/datasets/v3/trigger";
const PROGRESS = "https://api.brightdata.com/datasets/v3/progress";
const SNAPSHOT = "https://api.brightdata.com/datasets/v3/snapshot";
// Instagram *posts* dataset — hashtag discovery runs on this dataset with
// discovery query params. Override with BRIGHT_DATA_DATASET_HASHTAG.
const DEFAULT_POSTS_DATASET = "gd_lk5ns7kz21pck8jpis";

function loadDotEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  loadDotEnvLocal();

  if (!process.argv.includes("--yes")) {
    console.error(
      "This triggers the POST-PAID Bright Data API. Re-run with --yes to confirm.\n" +
        "  node scripts/smoke-hashtag.mjs --tag ブリトー --n 5 --yes",
    );
    process.exit(2);
  }
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    console.error("BRIGHT_DATA_API_KEY is not set (checked env and .env.local). Aborting — no request sent.");
    process.exit(2);
  }

  const tag = arg("tag", "ブリトー").replace(/^#/, "");
  const n = Math.min(20, Math.max(1, Number(arg("n", "5")) || 5));
  const datasetId = process.env.BRIGHT_DATA_DATASET_HASHTAG || DEFAULT_POSTS_DATASET;
  if (!process.env.BRIGHT_DATA_DATASET_HASHTAG) {
    console.log(`BRIGHT_DATA_DATASET_HASHTAG not set — defaulting to posts dataset ${DEFAULT_POSTS_DATASET}.`);
  }

  const url =
    `${TRIGGER}?dataset_id=${encodeURIComponent(datasetId)}` +
    `&format=json&include_errors=true&type=discover_new&discover_by=hashtag`;
  const payload = { input: [{ hashtag: tag, num_of_posts: n }] };
  console.log(`Trigger: dataset=${datasetId} tag=#${tag} num_of_posts=${n}`);

  const auth = { Authorization: `Bearer ${apiKey}` };
  const res = await fetch(url, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    console.error(`Trigger REJECTED (${res.status}) — usually a payload-shape validation error (no charge):`);
    console.error(bodyText.slice(0, 1000));
    process.exit(1);
  }

  let snapshotId;
  try {
    snapshotId = JSON.parse(bodyText).snapshot_id;
  } catch {
    /* fall through */
  }
  if (!snapshotId) {
    console.error("No snapshot_id in trigger response:");
    console.error(bodyText.slice(0, 1000));
    process.exit(1);
  }
  console.log(`snapshot_id=${snapshotId} — polling (5s interval, max 10min)...`);

  let status = "unknown";
  for (let i = 0; i < 120; i++) {
    const p = await fetch(`${PROGRESS}/${encodeURIComponent(snapshotId)}`, { headers: auth });
    const prog = await p.json().catch(() => ({}));
    status = prog.status ?? "unknown";
    process.stdout.write(`\r  status=${status} (${i * 5}s)   `);
    if (status === "ready") break;
    if (status === "failed") {
      console.error(`\nSnapshot FAILED: ${JSON.stringify(prog).slice(0, 1000)}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("");
  if (status !== "ready") {
    console.error(`Timed out with status=${status}. Snapshot ${snapshotId} may still finish — re-check in the Bright Data console.`);
    process.exit(1);
  }

  const snap = await fetch(`${SNAPSHOT}/${encodeURIComponent(snapshotId)}?format=json`, { headers: auth });
  const rawText = await snap.text();
  if (!snap.ok) {
    console.error(`Snapshot fetch failed (${snap.status}): ${rawText.slice(0, 500)}`);
    process.exit(1);
  }

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(process.cwd(), "data", `hashtag-smoke-${stamp}.json`);
  writeFileSync(outPath, rawText);

  let records = [];
  try {
    const parsed = JSON.parse(rawText);
    records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    /* leave records empty */
  }
  // Field names only — captions/comments may contain personal data (CLAUDE.md).
  console.log(`Saved raw snapshot → ${outPath}`);
  console.log(`Records: ${records.length}`);
  const keyCounts = new Map();
  for (const r of records.slice(0, 50)) {
    if (r && typeof r === "object") {
      for (const k of Object.keys(r)) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
    }
  }
  if (keyCounts.size > 0) {
    console.log("Field coverage (first 50 records):");
    for (const [k, c] of [...keyCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${c}`);
    }
    console.log(
      "\nNext: compare these field names with normalizeRawPost() aliases in src/lib/brightdata.ts.\n" +
        "If they line up, run the real collection from the /collect UI (hashtag mode).",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
