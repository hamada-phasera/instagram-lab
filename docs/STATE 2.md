# Project State — instagram-lab

> 最終更新: 2026-05-24 (M0 準備完了時点)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0 準備**: 
  - プロジェクトスケルトン `Harness_Engineering/instagram-lab/` を作成
  - PostToolUse フック登録（`.claude/settings.json` + `scripts/log-edit.sh`）
  - フックのスモークテスト成功（`EDIT_LOG.md` に1行追記される動作確認済み）
  - 初期ドキュメント配置: `CLAUDE.md`, `docs/{STATE,EDIT_LOG,requirements,tasks}.md`

## 進行中
- なし（M1 着手前）

## 次のマイルストーン
- **M1 Scaffold (直列)**: Next.js (App Router) + TS + Tailwind 初期化、依存一括追加、`pnpm dev/build/lint` 通過
- **M2 + M3 + M5 (並列)**: Bright Data クライアント / scoring / Claude analyze を 3 subagent 並列実装
- **M4 UI (直列)**: 4タブ UI（collect/breakout/catalog/voice）

## 既知の課題・懸念
- フックが発火するのは Claude Code を `instagram-lab/` を cwd として起動した時のみ。親 `Harness_Engineering/` から作業中は自動発火しない（次回セッションから有効）。
- `dataset_id` (BrightData) は `.env.local` に格納予定。実値は人間が手動で入れる。

## 環境・依存
- 必要 env: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_POSTS`, `BRIGHT_DATA_DATASET_REELS`, `BRIGHT_DATA_DATASET_COMMENTS`, `BRIGHT_DATA_DATASET_HASHTAG`, `ANTHROPIC_API_KEY`
- 推奨パッケージマネージャ: pnpm（npm でも動作）

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
