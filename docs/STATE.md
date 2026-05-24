# Project State — instagram-lab

> 最終更新: 2026-05-24 (Vercel デプロイ準備完了 — Blob ストレージ移行)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0 準備**: スケルトン + PostToolUse フック + 初期 docs
- **M1 Scaffold**: Next.js 16.2.6 + React 19 + Tailwind v4
- **M2 データ層**: BrightData クライアント + Zod パーサー + `/api/collect` POST
- **M3 スコアリング**: 純関数 + tax taxonomy + 19 tests
- **M5 Claude統合**: SDK wrapper + プロンプト + `/api/analyze` POST
- **M4 UI**: 4タブ (collect/breakout/catalog/voice) + TabNav + PostCard
- **/collect 配線**: `src/config/{accounts,hashtags}.ts` 外出し + `CollectForm` (Posts/Reels/Comments/Hashtag 4ボタン) + `/api/collect` GET (取得済みファイル一覧) + 接続状態バッジ
- **/catalog 配線**: `src/config/brand.ts` + `CatalogAnalyzer` (dynamic 5×5 matrix が分析後に埋まる) + per-post 分析/再分析ボタン
- **/voice 配線**: `VoiceAnalyzer` (per-post コメント分析) + surface_needs / latent_desires (要検証バッジ) / content_implications
- **モデル ID 統一**: 全箇所 `claude-sonnet-4-6` (現行最新 Sonnet) に統一
- **Vercel デプロイ準備**:
  - `src/lib/storage.ts` — Vercel Blob ⇔ ローカル FS の二重バックエンド (env で自動切替)
  - `/api/collect` POST/GET を storage 経由に refactor、`@vercel/blob` 追加
  - `/collect` ページは Server Component から `listCollected()` 直呼び（fetch round-trip 排除）
  - `.vercelignore` 追加（`data/`, `docs/EDIT_LOG.md`, `.claude/` 除外）
  - `.env.example` に `BLOB_READ_WRITE_TOKEN` 追加
  - `docs/DEPLOY.md` 作成 — CLI link → Blob 作成 → env 登録 → deploy の全手順

## 進行中
- なし（次タスク待ち）

## 次のマイルストーン候補（優先度順）
1. **実 Vercel デプロイ**: `docs/DEPLOY.md` 通り `vercel link` → Blob 作成 → env 登録 → `vercel deploy --prod`
2. **実 API テスト**: `.env.local` 設定後（または Vercel デプロイ後）、Bright Data → Claude の通し
3. **Bright Data alias マッピング調整**: 実レスポンス取得後に `parsePosts` の field alias を再調整
4. **取得 → 自動スコア → 自動分析のパイプライン化**: 1ボタンで全工程

## 既知の課題・懸念
- フックは現セッション（cwd=parent）からは自動発火せず、手動 backfill で対応中。次回 `cd instagram-lab && claude` から起動すれば自動発火する
- EDIT_LOG の "context" 欄は別プロジェクトの transcript jsonl を拾うことがある（無害）
- 投稿 `thumbnail_url` が fixture では fake なので Claude vision は実画像を取得できずエラーになる可能性。実 Bright Data 取得後に再試行
- Vercel Blob はパブリックアクセス設定。秘匿データを保存する場合は `access: "private"` に変更要

## 環境・依存
- 必要 env: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_{POSTS,REELS,COMMENTS,HASHTAG}`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN` (production のみ必須)
- パッケージマネージャ: npm (10.9.2) / Node 22.16
- Dev サーバ: `npm run dev -- -p 5050` (3000/4000 占有環境のため 5050 を使用)
- model id: `claude-sonnet-4-6`
- デプロイ: Vercel (next 16, node runtime) — `docs/DEPLOY.md` 参照

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
