# Project State — instagram-lab

> 最終更新: 2026-05-26 (ジャンルトレンド一本へ完全ピボット)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0〜M3**: スケルトン + Next.js + Bright Data クライアント + Claude 統合
- **Vercel 対応**: Blob ⇔ ローカル FS の二重ストレージ
- **Bright Data 実 API 接続**:
  - v3 async pattern (`{ snapshot_id }` → progress poll → snapshot fetch) を `pollSnapshot` で実装
  - parser alias を実 output (`user_posted` / `num_comments` / `date_posted` ISO / `thumbnail` / `content_type`) に合わせて再調整
  - `BrightDataError` のメッセージにレスポンス body を含め、4xx 原因が UI で読めるように
- **ジャンルトレンド完全ピボット (Phase 0〜2 完了)**:
  - **Phase 0**: `src/config/genres.ts` 新規 (5 ジャンル × 3〜5 タグ), `src/lib/trending.ts` 純関数 (EPH / reach_proxy / rank_weight / percentileRank / computeTrending), `TREND_WEIGHTS` 外部化, 22 ケースの unit test
  - **Phase 1**:
    - `/collect`: ジャンル一括 trigger UI に置き換え (アカウント dropdown 廃止)
    - `/trending` (旧 `/breakout` をリネーム): TrendingFeed クライアント + ジャンル/ソートフィルタ + サムネクリックで PostModal (Instagram `embed/` iframe + サムネ fallback)
    - `/api/collect`: optional `genre` 受領、hashtag+genre は prefix `trending` で永続化、`source_hashtag` を各 Post に injection
    - `brightdata.parsePosts`: PostSchema に `date_iso?` / `source_hashtag?` 追加、`normalizeRawPost` で full ISO 出力
    - `storage.readCollectedJson()` ヘルパ追加 (Blob/local 両対応)
  - **Phase 2**:
    - `/catalog` `/voice` を `loadAllTrending` (上位 N 件) ベースに書き換え
    - `CatalogAnalyzer` / `VoiceAnalyzer` の入力型を `Scored` → `Trending` に変更、`view_ratio` / `is_breakout` の表示を `trend_score` に置換
    - レガシー削除: `src/lib/scoring.ts`, `src/config/{accounts,hashtags}.ts`, `src/components/PostCard.tsx`, `src/lib/fixtures.ts`, `tests/unit/scoring.test.ts`, `Scored` 型, `T_VIEW`/`T_JUMP` 定数
    - TabNav ラベル「② ブレイク」→「② トレンド」、ランディングページ文言更新

## 進行中
- なし

## 次のマイルストーン候補（優先度順）
1. **実 Bright Data Hashtag dataset 接続検証**: 1 ジャンル一括取得を 1 回実行して、`source_hashtag` injection + dedupe + trend_score が期待通り動くか実機確認
2. **コスト UI 厳密化**: `1 ジャンル ≈ $0.10` の概算を、実 Bright Data 単価で再計算（現在は仮）
3. **PostModal iframe の private 投稿フォールバック**を実投稿で検証
4. **Vercel デプロイ**: `vercel link` → Blob 作成 → env 登録 → `vercel deploy --prod`
5. **コメント取得 trigger** を `/collect` に再追加するか検討（現状は hashtag のみ）

## 既知の課題・懸念
- Bright Data Hashtag dataset は `BRIGHT_DATA_DATASET_HASHTAG` が未設定だと 503。`.env.local` で要設定。
- Instagram `embed/` iframe は private/削除済み投稿で空白 → フォールバックがサムネ拡大に切り替わる。実機未検証
- `tests/unit/claude.test.ts` に Anthropic SDK 型不整合の pre-existing エラー 1 件あり（テストは通る、tsc のみ警告）
- 親ディレクトリ `~/Desktop/Harness_Engineering/` に過去の誤 `npm install` 残骸あり（手動で `rm -rf` 推奨、Next.js が警告を出す）

## テスト状況
- `npm test -- --run`: **42 / 42 緑** (brightdata 12 + trending 22 + claude 8)
- 元の 19 scoring tests は廃棄済み（per-account 仕組み自体が消えたため）
- `npx tsc --noEmit`: 私の変更には型エラー 0、pre-existing 1 件のみ

## 環境・依存
- 必要 env: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_HASHTAG`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN` (production のみ必須)
- `BRIGHT_DATA_DATASET_{POSTS,REELS,COMMENTS}` は UI から外したが route handler は残存（再利用余地）
- パッケージマネージャ: npm (10.9.2) / Node 22.16
- Dev サーバ: `npm run dev -- -p 5050`
- model id: `claude-sonnet-4-6`
- デプロイ: Vercel (next 16, node runtime) — `docs/DEPLOY.md` 参照

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
