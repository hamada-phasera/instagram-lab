# Project State — instagram-lab

> 最終更新: 2026-05-24 (M2/M3/M5 完了、合流済み)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0 準備**: スケルトン + PostToolUse フック + 初期 docs（スモークテスト成功）
- **M1 Scaffold**: Next.js 16.2.6 + React 19 + Tailwind v4、`npm run build` 通過、依存473パッケージ
- **M2 データ層** (subagent 並列):
  - `src/types/post.ts` — `Post` / `Scored` / `MediaType` 型
  - `src/lib/brightdata.ts` — `fetchDataset` (Bearer 認証 + `BrightDataError`) + Zod `PostSchema` + `parsePosts`
  - `src/app/api/collect/route.ts` — POST、env欠如時 503、`data/{type}-{ts}.json` 書き出し
  - `tests/mocks/posts.json` — 7件 (reel/feed/carousel 混在、ブレイク候補 1件含む)
  - `tests/unit/brightdata.test.ts` — 7 tests pass
- **M3 スコアリング** (subagent 並列):
  - `src/config/thresholds.ts` — `T_VIEW=3.0`, `T_JUMP=2.0`
  - `src/lib/scoring.ts` — 純関数 `median` / `accountMedianEngagement` / `viewRatio` / `engagementJump` / `score` / `scoreAll`、合流時に `@/types/post` から型を再 export に変更済み
  - `src/lib/taxonomy.ts` — `HOOK_TYPES` × `VISUAL_TYPES` enum + `matrix()` 25要素
  - `tests/unit/scoring.test.ts` — 19 tests pass
- **M5 Claude統合** (subagent 並列):
  - `src/lib/prompts/{voice,catalog}.ts` — system 定数 + builder 関数
  - `src/lib/claude.ts` — `analyzeVoice` / `analyzeCatalog`、`cache_control: ephemeral` 付き、model `claude-sonnet-4-5`
  - `src/app/api/analyze/route.ts` — POST、env欠如時 503
  - `tests/unit/claude.test.ts` — 8 tests pass
- **合流**: M3 のローカル `Post` 型を `@/types/post` の re-export に統合、全 34 tests pass、`npm run build` 通過

## 進行中
- なし（M4 着手前）

## 次のマイルストーン
- **M4 UI (直列)**: 4タブ (collect / breakout / catalog / voice) を frontend-design スキル使用で実装、`tests/mocks/posts.json` を読ませて画面確認

## 既知の課題・懸念
- `src/app/api/collect/route.ts` はローカル `data/*.json` に書き出すため、Vercel serverless 環境では動作しない。本番化時は Vercel Blob か Neon Postgres への置換が必要（MVPはローカル想定）
- model id は M5 内で `claude-sonnet-4-5` を採用（CLAUDE.md/requirements.md は `claude-sonnet-4-7` 表記、後日統一）
- Bright Data 実レスポンス未確認のため `parsePosts` の alias マッピングは推測。実取得後に再調整必要
- フックは現セッション（cwd=parent）からは自動発火せず、手動 backfill で対応中

## 環境・依存
- 必要 env: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_{POSTS,REELS,COMMENTS,HASHTAG}`, `ANTHROPIC_API_KEY`
- パッケージマネージャ: npm (10.9.2) / Node 22.16

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
