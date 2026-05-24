# Project State — instagram-lab

> 最終更新: 2026-05-24 (M4 完了 — MVP 出来)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0 準備**: スケルトン + PostToolUse フック + 初期 docs（スモークテスト成功）
- **M1 Scaffold**: Next.js 16.2.6 + React 19 + Tailwind v4、依存 473 パッケージ
- **M2 データ層** (subagent 並列):
  - `src/types/post.ts` / `src/lib/brightdata.ts` (Zod + `BrightDataError`) / `src/app/api/collect/route.ts`
  - `tests/mocks/posts.json` 7件 / `tests/unit/brightdata.test.ts` 7 tests
- **M3 スコアリング** (subagent 並列):
  - `src/config/thresholds.ts` / `src/lib/scoring.ts` / `src/lib/taxonomy.ts`
  - `tests/unit/scoring.test.ts` 19 tests
- **M5 Claude統合** (subagent 並列):
  - `src/lib/prompts/{voice,catalog}.ts` / `src/lib/claude.ts` (`cache_control: ephemeral`) / `src/app/api/analyze/route.ts`
  - `tests/unit/claude.test.ts` 8 tests
- **合流**: `scoring.ts` を `@/types/post` の re-export に統合、34 tests 通過、build 通過
- **M4 UI** (直列):
  - `src/components/TabNav.tsx` (active 状態 + sticky) / `src/components/PostCard.tsx`
  - `src/app/(ui)/layout.tsx` (共通レイアウト)
  - 4タブページ: `(ui)/{collect,breakout,catalog,voice}/page.tsx`
  - `src/lib/fixtures.ts` (モック投稿読込ヘルパ)
  - agent-browser で 4 ルート全動作確認 (/breakout はスクリーンショット保存済)

## 進行中
- なし（MVP 完成）

## 次のマイルストーン候補（優先度順）
1. **実 API 接続**: `.env.local` に Bright Data / Anthropic キー設定 → `/collect` ボタンに実トリガ実装
2. **`data/*.json` の Vercel Blob / Neon 移行**: serverless 環境で動作させる
3. **`/api/analyze` の UI 統合**: catalog ページの＋ボタンから Claude vision を実行
4. **コメント取得 API**: Bright Data の comments エンドポイント呼び出し → voice タブで実分析
5. **モデル ID 統一**: requirements/CLAUDE.md は `claude-sonnet-4-7`、claude.ts は `claude-sonnet-4-5`。どちらかに統一

## 既知の課題・懸念
- `src/app/api/collect/route.ts` はローカル FS 書込み → Vercel serverless で動かない（MVP 想定では問題なし）
- フックは現セッション（cwd=parent）からは自動発火せず、手動 backfill で対応中。次回 `cd instagram-lab && claude` から起動すれば自動発火する
- EDIT_LOG の "context" 欄は別プロジェクトの transcript jsonl を拾うことがある（無害だが見た目が混乱する）
- Bright Data 実レスポンス未確認のため `parsePosts` の alias マッピングは推測ベース（実取得後に調整）

## 環境・依存
- 必要 env: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_{POSTS,REELS,COMMENTS,HASHTAG}`, `ANTHROPIC_API_KEY`
- パッケージマネージャ: npm (10.9.2) / Node 22.16
- Dev サーバ: `npm run dev` → port 3000 (3001 fallback)

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
