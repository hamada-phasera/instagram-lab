# instagram-lab — Instagram Trend Discovery

## Overview
Instagram の**ジャンル（ハッシュタグ群）横断**で「いま伸びている投稿」を発見し、その**獲得の素**（フック型 × ビジュアル型）と**声**（コメント分析）を分解する社内ツール。クリエイティブ担当のフィード設計に転用する。

**特定アカウントを watch しない**ジャンル発見型。ジャンル定義（例: 飲食/ソフトウェア/ファッション/旅行/ライフスタイル）は `src/config/genres.ts` で外部化、用途に応じて差し替え可能。

---

## Session Start Protocol（最重要）
新しいチャット冒頭、または **「現状は？」「進捗は？」「どこまでやった？」** と聞かれた時は、必ず以下を順に実行してから答える:

1. `docs/STATE.md` 全文を読む — マイルストーン単位の現在地
2. `docs/EDIT_LOG.md` の **末尾 50 行** を読む — 直近のファイル変更履歴（自動生成）
3. 必要なら `git log --oneline -10` で補強
4. 上記3点を統合して、現在地・直前にやったこと・次にやるべきことを返答

EDIT_LOG.md は append-only の自動ログ、STATE.md は手動の現状サマリ。両者の役割を混同しない。

---

## Harness — Auto Edit Log

`.claude/settings.json` に `PostToolUse` フックを登録済み。Edit / Write / MultiEdit のたびに `scripts/log-edit.sh` が走り、`docs/EDIT_LOG.md` に1行追記する。

- **触らない**: フック動作中の EDIT_LOG.md は append-only。既存行の編集・削除は禁止。
- **どこから発火するか**: `cwd` または編集対象パスが `instagram-lab/` 配下のときのみ。他プロジェクトでは絶対に発火しない。
- **失敗してもブロックしない**: フックが落ちても Edit は通る（exit 0 保証）。

ログ形式:
```
- [YYYY-MM-DD HH:MM:SS] Edit `src/lib/trending.ts` — 直近のユーザープロンプト冒頭80字
```

---

## Parallel Execution Policy

依存が無い独立タスクは **subagent を 1メッセージで複数起動して並列実行** する。直列にする/しないの判断基準:

- **並列OK**: 触るファイルがディレクトリレベルで排他 / 共有ファイル（`package.json` 等）は親が事前に確定
- **直列にする**: 同じファイルを両側が触る / 後段が前段の型・関数に依存している / scaffold 系の基盤作業

本プロジェクトの並列マップ (歴史的):
- M0/M1 Scaffold — 直列（基盤）
- M2 BrightData / M3 scoring (now trending) / M5 Claude — 3並列（独立）
- M4 UI / Pivot — 直列（M2/M3/M5 を全部消費）

ジャンルトレンドピボット完了後は、新機能追加時に同様の判断を都度行う。

並列起動の例:
```
（1メッセージ内で3つ並べる）
Agent(subagent_type="general-purpose", description="M2 data layer", ...)
Agent(subagent_type="general-purpose", description="M3 scoring", ...)
Agent(subagent_type="general-purpose", description="M5 ai integration", ...)
```

---

## Business Context
- Target: Instagram で集客するブランドのクリエイティブ担当・運用者（社内ツール）
- Problem: 競合の **平常運転** を見ても新規獲得には繋がらない。**ジャンル全体で今伸びている投稿**を横断発見し、なぜ刺さっているかを再現可能な語彙に分解する
- North Star Metric: 採用された型・起点の投稿が稼いだ **推定トレンドスコア** (`pctRank(EPH) × 0.5 + pctRank(reach) × 0.3 + rank_weight × 0.2`)
- MVP Scope: ①Bright Data 収集 (ジャンル一括) → ②トレンド一覧 (サムネ→ embed プレビュー) → ③型カタログ（フック×ビジュアル） → ④コメント声分析

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- データ取得: Bright Data Instagram Scraper API（**server-side API route から呼ぶ**）
- 分析: Anthropic API / Claude（声分析・型分解を **server-side**、クライアントにキーを露出させない）
- ストレージ: MVPは `data/*.json`（ローカルキャッシュ）、後でDB化可
- 画像: Bright Data の thumbnail / media URL を**参照表示**（再ホストしない）

## Build & Run
```bash
pnpm install         # Install (npm でも可)
pnpm dev             # Dev server
pnpm build           # Build
pnpm lint            # Lint
pnpm test            # Unit (vitest)
pnpm test:ci         # CI: JSON output → test-results.json
```

## Directory Structure
```
src/
├── app/
│   ├── (ui)/             # 4タブUI: collect / trending / catalog / voice
│   └── api/              # route handlers (Backend)
│       ├── collect/      # Bright Data 取得トリガ (hashtag + 任意 genre)
│       └── analyze/      # Claude 声分析・型分解
├── lib/
│   ├── brightdata.ts     # Bright Data クライアント + snapshot polling
│   ├── trending.ts       # トレンドスコア純関数 (EPH / reach / rank_weight)
│   ├── loadTrending.ts   # トレンド一覧ローダ (/trending /catalog /voice 共用)
│   ├── storage.ts        # Vercel Blob ⇔ ローカル FS 二重ストレージ
│   ├── claude.ts         # Anthropic クライアント
│   └── taxonomy.ts       # フック型 × ビジュアル型 定義
├── components/           # UI (Frontend)
├── types/                # 共有型（Backend owns, all read）
└── config/
    ├── genres.ts         # ジャンル × ハッシュタグ群 定義
    ├── thresholds.ts     # TREND_WEIGHTS (eph 0.5 / reach 0.3 / rank 0.2)
    └── brand.ts          # ブランド翻訳用ラベル
data/                     # 取得JSONキャッシュ（.gitignore）
docs/
├── STATE.md              # ✋ 手動: マイルストーン完了時の現状サマリ
├── EDIT_LOG.md           # 🤖 自動: PostToolUse フックが追記
├── requirements.md       # 要件定義
└── tasks.md              # 実装計画（M1〜M5）
scripts/
└── log-edit.sh           # PostToolUse フック本体
tests/
├── unit/ ── integration/ ── mocks/
```

## Data Pipe — Bright Data
- API: `POST https://api.brightdata.com/datasets/v3/trigger?dataset_id={ID}&format=json` / Auth: `Bearer $BRIGHT_DATA_API_KEY`
- **v3 async pattern**: trigger は `{ snapshot_id }` を返す。`pollSnapshot` で progress (5s 間隔) → ready 後に snapshot 取得
- 主に使うのは **`hashtag` dataset**（`BRIGHT_DATA_DATASET_HASHTAG`）。`posts / reels / comments` の dataset env は残存だが UI からは外している
- 取得項目: followers, likes, num_comments, views (reel), description, date_posted (ISO), url, thumbnail
- 無料$2クレジットで開始。**後課金**。実呼び出しは人間確認後（下記 Forbidden 参照）。

## Trend Scoring（core logic / `lib/trending.ts`）
- `EPH = (likes + comments) / max(1, hours_since_post)` — 伸び率代理
- `reach_proxy = views / followers`（reel） or `likes / followers`（feed/carousel）
- `rank_weight = 1 / log2(hashtag_top_rank + 1)` — DCG 風、ハッシュタグ内順位 1 で 1.0
- `trend_score = 0.5 * pctRank(EPH) + 0.3 * pctRank(reach_proxy) + 0.2 * rank_weight`
- 同一 `post_url` は dedupe、複数ハッシュタグに乗る場合は min rank 採用、`source_hashtags` を集約
- ⚠️ **保存・シェア・リーチは非公開で取得不可**。上記はあくまで代理指標。「確定的にバズった」「ブレイク確定」と書かない。

## Type Taxonomy (`lib/taxonomy.ts`)
- フック型: 意外性/常識破壊 ・ 保存性/ハック ・ シズル/断面 ・ 数字/ランキング ・ ローカル/地名
- ビジュアル型: 1枚目の文字量 ・ 高コントラスト/色数 ・ 寄り/質感 ・ 人の気配 ・ スケール/インパクト
- Claude(vision) で caption + thumbnail からタグ付け → 「フック型 × ビジュアル型」の再現レシピ化

## Design（frontend-design）
- **frontend-design スキルを環境にあれば必ず使う**。無ければ以下を守る:
  - 汎用AI美学を避ける（Inter/Roboto/system-font、白地に紫グラデ禁止）
  - エディトリアルの温かみを意識。表示用フォントは個性的なもの（Zen系等）
  - CSS変数でテーマ管理、密度はコントロール、データ表は明確に
  - モダンで使いやすさ最優先（迷わない導線・右スキャンでも情報設計）

## Code Style
- Naming: camelCase（関数/変数）, PascalCase（型/クラス）
- Imports: external → internal, alphabetical
- Max function length: 50 lines / `any` 原則禁止
- スコアリングは純関数で（テスト容易性）

## Testing Rules
- `pnpm test:ci` → `test-results.json`
- Coverage: lines 80% 以上
- テストの削除・`.skip` 禁止 / 対象関数自体をモックしない
- 新規関数は ≥1 テスト + ≥1 エッジケース
- **後課金API（Bright Data / Anthropic）はテストでモック必須**（実呼び出し禁止）

## Git Convention
- `type(scope): description` / types: feat, fix, test, refactor, docs, chore
- マイルストーン完了ごとにコミット

## Forbidden Actions
### 技術
- NEVER: `rm -rf`, `DROP TABLE`, `terraform apply/destroy`, `git push --force`
- NEVER: main へ直接 push / PR の auto-merge（PR作成までで、マージは人間）
- NEVER: `.env` / APIキー / Bearerトークンをコミット
- Infrastructure: `plan` のみ

### データ・課金
- NEVER: Bright Data / Anthropic の**後課金APIをテスト or 無断で叩く**（実呼び出しは人間が手動トリガ）
- NEVER: コメント本文など取得データに含まれる個人情報をログ・コミット
- NEVER: スクレイプ画像を再ホスト・再配布（参照URL表示のみ）

### ログ・状態管理
- NEVER: `docs/EDIT_LOG.md` の既存行を編集・削除（append-only / フックが管理）
- NEVER: `docs/STATE.md` を独断で更新せず、マイルストーン完了時にユーザー確認を取る
- NEVER: 「ブレイク確定」「確定的にバズった」断定表現（必ず「推定」「代理指標」と表記）。`trend_score` は「推定トレンドスコア」
