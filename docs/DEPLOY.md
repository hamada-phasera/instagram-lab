# Vercel デプロイ手順

> ローカル `data/*.json` 書き込みは Vercel Blob に切り替え済み (`src/lib/storage.ts`)。
> `BLOB_READ_WRITE_TOKEN` の有無で自動的に Blob ⇔ ローカル FS を切り替える。

## 1. Vercel CLI 準備

```bash
npm i -g vercel@latest   # 既存があれば最新化
vercel --version          # 54.x 以降推奨
vercel login              # GitHub / メール認証
```

## 2. プロジェクト link

```bash
cd /Users/hamadahiromu/Desktop/Harness_Engineering/instagram-lab
vercel link               # 新規プロジェクト名: instagram-lab を推奨
```

`vercel link` 後、`.vercel/` ディレクトリが作成される（既に `.gitignore` 対象）。

## 3. Blob ストレージ作成

ダッシュボード経由（推奨）:
1. https://vercel.com/dashboard → 該当プロジェクト
2. **Storage** タブ → **Create Database** → **Blob**
3. 名前 `instagram-lab-collected` 等で作成
4. **自動的に `BLOB_READ_WRITE_TOKEN` が env に追加される**（プロジェクトに自動 link）

CLI 経由（代替）:
```bash
vercel blob create instagram-lab-collected
# 出力された token を vercel env add でセット
```

## 4. 環境変数を Vercel に登録

```bash
# 一括登録（プロンプトに従って値を入れる）
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview      # 同じ値でOK
vercel env add BRIGHT_DATA_API_KEY production
vercel env add BRIGHT_DATA_DATASET_POSTS production
vercel env add BRIGHT_DATA_DATASET_REELS production
vercel env add BRIGHT_DATA_DATASET_COMMENTS production
vercel env add BRIGHT_DATA_DATASET_HASHTAG production
# BLOB_READ_WRITE_TOKEN はステップ3で自動セット済み（Storage 接続時）
```

確認:
```bash
vercel env ls
```

## 5. ローカルに env を取り込む（オプション）

Vercel に登録した env をローカル `.env.local` に同期したい場合:
```bash
vercel env pull .env.local
```

## 6. デプロイ

```bash
# プレビューデプロイ（feature ブランチ的）
vercel deploy

# 本番デプロイ
vercel deploy --prod
```

デプロイ後、出力された URL にアクセスして:
- `/collect` で接続バッジが緑 → ボタンで実取得
- 取得済みファイルが Blob から一覧表示（ファイル名がリンクになり、Blob URL を開ける）
- `/catalog` `/voice` で Claude 分析

## デプロイ前チェックリスト

- [ ] `npm run build` ローカルで通る
- [ ] `npm test` 34 通る
- [ ] `.vercelignore` に `data/`, `docs/EDIT_LOG.md`, `.claude/` が入っている
- [ ] `.gitignore` に `.env.local` が入っている（CLAUDE.md Forbidden）
- [ ] `vercel env ls` で 6 つの env が production に存在（ANTHROPIC, BRIGHT_DATA_API_KEY, 4×DATASET, BLOB_READ_WRITE_TOKEN）

## ロールバック

```bash
vercel rollback <deployment-url>
```

または Vercel ダッシュボード → **Deployments** → 過去のデプロイを **Promote to Production**。

## 注意点

- **後課金API**は本番でも気軽に叩かない。/collect, /catalog, /voice の各ボタンはコスト発生
- Vercel function は **node runtime** 指定済み (`export const runtime = "nodejs"`)。Edge では `@vercel/blob` / `@anthropic-ai/sdk` の一部機能が動かない
- Vercel Blob はパブリックアクセス (`access: "public"`)。秘匿データを保存する場合は private に変更要
- 取得済みファイル一覧は Blob の `list()` を毎リクエスト叩く（コスト極小だが、件数増えたらキャッシュ検討）
