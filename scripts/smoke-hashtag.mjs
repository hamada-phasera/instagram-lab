#!/usr/bin/env node
/**
 * One-shot smoke test for Bright Data hashtag discovery (post-paid API).
 *
 * Empirically determines the working wire format for hashtag-based
 * collection. Bright Data rejects a malformed trigger with a 400 validation
 * error BEFORE any scraping happens (= no charge), so this script walks an
 * ordered list of candidate formats: each 400 is free and printed verbatim;
 * the first accepted trigger proceeds to polling and snapshot download.
 *
 * Established so far (2026-08-24, real 400 responses):
 *   - posts dataset gd_lk5ns7kz21pck8jpis + discover_by=hashtag
 *     → "Incorrect discovery collector id Available types: url"
 *   - posts dataset + discover_by=url + explore/tags URL
 *     → validation reject: url must match a profile-URL pattern
 *       (input schema: url / num_of_posts / start_date / end_date / post_type)
 *   - profile-discover gd_l1vikfch901nx3by4 + explore/tags URL
 *     → trigger accepted; job returns error row "Crawler error: Mobile
 *       frontend profile HTML for explore does not contain
 *       xig_user_by_igid_v2" (crawler parses input as a profile page)
 *   ⇒ neither general dataset does hashtags; use the dedicated hashtag
 *     scraper's dataset id from the Bright Data console via --dataset.
 *
 * NEVER runs implicitly: requires --yes AND BRIGHT_DATA_API_KEY in
 * .env.local (or the environment). Per CLAUDE.md, a human runs this — CI
 * and tests must not.
 *
 * Usage:
 *   node scripts/smoke-hashtag.mjs --tag ブリトー --n 5 --yes
 *   # manual override of a single candidate:
 *   node scripts/smoke-hashtag.mjs --tag ブリトー --n 5 --yes \
 *     --dataset gd_xxx --discover-by url
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
const POSTS_DATASET = "gd_lk5ns7kz21pck8jpis"; // Instagram - Posts
const PROFILE_DISCOVER_DATASET = "gd_l1vikfch901nx3by4"; // posts-discover-by-url (proven in production)

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

/**
 * Candidate wire formats, tried in order. A 400 validation reject is free;
 * the first 2xx wins. `explore/tags/<tag>/` is the canonical hashtag URL.
 */
function buildCandidates(tag, n) {
  const tagUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
  const hashtagEnv = process.env.BRIGHT_DATA_DATASET_HASHTAG;
  const discoverEnv = process.env.BRIGHT_DATA_DATASET_DISCOVER;
  const candidates = [
    {
      label: "posts + discover_by=url + explore/tags URL + num_of_posts",
      dataset: hashtagEnv || POSTS_DATASET,
      qp: { type: "discover_new", discover_by: "url" },
      input: { url: tagUrl, num_of_posts: n },
    },
    {
      label: "posts + discover_by=url + explore/tags URL (no num_of_posts)",
      dataset: hashtagEnv || POSTS_DATASET,
      qp: { type: "discover_new", discover_by: "url" },
      input: { url: tagUrl },
    },
    {
      label: "profile-discover dataset + explore/tags URL (mirrors proven profile flow)",
      dataset: discoverEnv || PROFILE_DISCOVER_DATASET,
      qp: undefined,
      input: { url: tagUrl },
    },
  ];
  // Manual override narrows to a targeted sweep over one dataset. With
  // --discover-by it is a single attempt; without, it walks the likely
  // input shapes for a dedicated hashtag scraper (each 400 is free).
  const dsOverride = arg("dataset", "");
  if (dsOverride) {
    const by = arg("discover-by", "");
    const shapes = {
      hashtag: { hashtag: tag, num_of_posts: n },
      keyword: { keyword: tag, num_of_posts: n },
      url: { url: tagUrl, num_of_posts: n },
    };
    const order = by ? [by] : ["hashtag", "keyword", "url"];
    return order.map((b) => ({
      label: `manual: ${dsOverride} discover_by=${b}`,
      dataset: dsOverride,
      qp: { type: "discover_new", discover_by: b },
      input: shapes[b] ?? shapes.hashtag,
    }));
  }
  return candidates;
}

async function tryTrigger(auth, cand) {
  const extra = cand.qp
    ? Object.entries(cand.qp)
        .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("")
    : "";
  const url = `${TRIGGER}?dataset_id=${encodeURIComponent(cand.dataset)}&format=json&include_errors=true${extra}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ input: [cand.input] }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, bodyText };
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
  const auth = { Authorization: `Bearer ${apiKey}` };

  let snapshotId;
  let winner;
  for (const cand of buildCandidates(tag, n)) {
    console.log(`\nTrying: ${cand.label}`);
    console.log(`  dataset=${cand.dataset} qp=${JSON.stringify(cand.qp ?? {})} input=${JSON.stringify(cand.input)}`);
    const r = await tryTrigger(auth, cand);
    if (!r.ok) {
      console.log(`  REJECTED (${r.status}, no charge): ${r.bodyText.slice(0, 300)}`);
      continue;
    }
    try {
      snapshotId = JSON.parse(r.bodyText).snapshot_id;
    } catch {
      /* fall through */
    }
    if (!snapshotId) {
      console.log(`  Accepted but no snapshot_id?: ${r.bodyText.slice(0, 300)}`);
      continue;
    }
    winner = cand;
    break;
  }

  if (!snapshotId || !winner) {
    console.error(
      "\nAll candidates rejected. Next step: open the Bright Data console →\n" +
        "Web Scraper API → Instagram → look for a hashtag scraper and copy its\n" +
        "dataset id, then re-run with:\n" +
        "  node scripts/smoke-hashtag.mjs --tag ブリトー --n 5 --yes --dataset gd_xxxx --discover-by hashtag",
    );
    process.exit(1);
  }

  console.log(`\nACCEPTED: ${winner.label}`);
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
  console.log(`Winning format: ${winner.label}`);
  console.log(`Records: ${records.length}`);
  // Error rows carry Bright Data diagnostics (not scraped content) — safe
  // and necessary to print, otherwise a failed job looks like a success.
  const errorRows = records.filter((r) => r && typeof r === "object" && ("error" in r || "error_code" in r));
  if (errorRows.length > 0) {
    console.log(`Error rows: ${errorRows.length}/${records.length}`);
    for (const r of errorRows.slice(0, 5)) {
      console.log(`  error_code=${String(r.error_code ?? "")} error=${String(r.error ?? "").slice(0, 300)}`);
    }
  }
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
      "\nNext: paste this output back to Claude — the /collect route will be\n" +
        "aligned to the winning format and these field names.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
