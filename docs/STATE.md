# Project State — instagram-lab

> 最終更新: 2026-07-06 (Vercel 本番デプロイ + private Blob + 全体 Basic Auth ゲート)
> 詳細な変更履歴は [EDIT_LOG.md](EDIT_LOG.md) を参照。

## 完了済み
- **M0〜M3**: スケルトン + Next.js + Bright Data クライアント + Claude 統合
- **ジャンルトレンド完全ピボット (Phase 0〜2)**: `genres.ts` (5ジャンル×seed accounts), `trending.ts` 純関数 (EPH/reach_proxy/rank_weight/percentileRank/computeTrending), `/collect`ジャンル一括 / `/trending`フィード+PostModal / `/catalog` / `loadAllTrending`。レガシー(scoring/accounts/hashtags/PostCard/fixtures)削除済み。
- **Bright Data 実 API 接続**: v3 async (`snapshot_id`→progress poll→snapshot) を `pollSnapshot`。profile discover の入れ子 `posts[]` を平坦化して parse。実測で 12件/ジャンル取得成功（`data/trending-2026-05-26T07-33-*.json`）。
- **Vercel 本番デプロイ (2026-07-06)**:
  - プロジェクト `hamahiro1668s-projects/instagram-lab`、本番エイリアス **`instagram-lab-gold.vercel.app`**。
  - `@vercel/blob@^2.5.0` を依存追加（storage.ts が import するのに未宣言でビルド失敗していた実バグを修正）。
  - **private Blob ストア** `instagram-lab-collected` を作成・プロジェクト連携（`BLOB_READ_WRITE_TOKEN` 自動注入）。storage.ts を private 対応に改修（読取りは `get({access:"private"})` のストリーム消費）。
  - **全ルート Basic Auth ゲート** `src/proxy.ts`（Next16 proxy 規約）。`/api` 含め全体をロック。`SITE_BASIC_AUTH_USER/PASSWORD` が本番 env に登録済み（両方未設定なら素通り＝ローカルdev無効）。
  - `/voice`（④声）タブは非表示（TabNav/page.tsx コメントアウト、route は温存）。

## 進行中
- なし（デプロイ一区切り）。次マイルストーン待ち。

## 次のマイルストーン候補（優先度順）
1. **seed accounts のカスタマイズ** ([src/config/genres.ts](src/config/genres.ts))。現在 placeholder (foodandwine/github 等) → 実案件のブランド/競合に差し替え。
2. **本番で 1 ジャンル収集を実行**（Basic Auth ログイン後）。private Blob 書込み + trend_score を実機確認 (~$0.10)。
3. **コメント声分析(④)の復活**: discover-by-url は comment_texts を返さない → `instagram-comments` データセット追加購読 + post_url 紐付けが必要。
4. **プラン判断**: 収集は `maxDuration=300` 前提。Hobby だとタイムアウト懸念 → Pro 化 or 収集の非同期化を検討。Pro 化すれば Basic Auth を Vercel Authentication に置換可。

## 既知の課題・懸念
- **構造的データギャップ**: profile discover は **views / comment_texts を返さない**。→ reel の reach_proxy が likes/followers にフォールバック、声分析④はデータ源なし。
- **Hobby プラン制約**: Vercel Authentication は本番ドメインに効かない(428) → コードの Basic Auth で代替中。
- Instagram `embed/` iframe は private/削除済み投稿で空白 → サムネ拡大にフォールバック（実機未検証）。
- 親ディレクトリ `~/Desktop/Harness_Engineering/` と `~/` に野良 lockfile → ローカルビルドで workspace root 誤検出の警告（デプロイには無害）。

## テスト状況
- `npx vitest run`: **43 / 43 緑** (brightdata 13 + trending 22 + claude 8)
- `npm run build`: 型エラー 0 / Compiled successfully（proxy 認識、非推奨警告なし）

## 環境・依存
- 本番 Vercel env (production): `ANTHROPIC_API_KEY`, `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_DATASET_DISCOVER`, `BLOB_READ_WRITE_TOKEN`(Prod/Preview/Dev), `SITE_BASIC_AUTH_USER`, `SITE_BASIC_AUTH_PASSWORD`
- ローカル `.env.local`: Bright Data 各 dataset + `ANTHROPIC_API_KEY`（`BLOB_READ_WRITE_TOKEN` は空 = FS フォールバック）
- パッケージマネージャ: npm (10.9.2) / Node 22.16 / model id `claude-sonnet-4-6`
- デプロイ: `vercel deploy --prod --scope hamahiro1668s-projects`（cwd=instagram-lab 厳守）— `docs/DEPLOY.md` 参照
- Dev サーバ: `npm run dev -- -p 5050`

---

## 更新ルール
- このファイルは **マイルストーン完了時に手動で上書き** する。
- セクション構造は固定（完了済み / 進行中 / 次のマイルストーン / 既知の課題 / 環境・依存）。
- 常に 100 行以内を目安にする。詳細は EDIT_LOG.md に任せる。
