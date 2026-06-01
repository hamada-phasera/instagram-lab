# instagram-lab — Instagram トレンド発見ツール

> Instagram の**ジャンル横断**で「いま伸びている投稿」を発見し、その**獲得の素**（フック型 × ビジュアル型）と**声**（コメント分析）を分解する社内クリエイティブ支援ツール。

[![Stack](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/) [![Claude](https://img.shields.io/badge/Claude-SDK-d97757)](https://www.anthropic.com/)

---

## 概要

特定アカウントを追わず、**ジャンル（飲食 / ソフトウェア / ファッション / 旅行 / ライフスタイル等）単位**で伸びている投稿を横断発見する。発見した投稿を「なぜ伸びたか」の要素に分解し、クリエイティブ担当のフィード設計に転用する。

ジャンル定義は `src/config/genres.ts` に外部化されており、用途に応じて差し替え可能。

---

## 主な機能

- **ジャンル横断トレンド発見** — プロフィールURLベースの収集（ハッシュタグ依存から移行）
- **伸び度スコアリング** — 投稿のエンゲージメント傾向を定量化してランキング
- **獲得要素の分解** — フック型 / ビジュアル型の観点で投稿を分類
- **コメント分析** — Claude による「声」の抽出
- **トレンドフィードUI** — ジャンルバッチ表示 + iframe 埋め込みモーダル

---

## 技術スタック

| 領域 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) / React 19 / TypeScript |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) |
| データ収集 | BrightData（Instagram プロフィール取得） |
| バリデーション | Zod |
| テスト | Vitest |

**規模**: TypeScript 約2,700行 / APIルート2本（collect / analyze）/ テスト3ファイル

---

## セットアップ

```bash
pnpm install
cp .env.example .env.local   # APIキー等を設定
pnpm dev                     # 開発サーバー :3000
pnpm test                    # テスト
```

---

## このプロジェクトで見せられること

- **外部データ収集 × AI分析のパイプライン**設計
- **ピボット力**（アカウントwatch型 → ジャンル発見型へリファクタ）
- **設定の外部化**による再利用性の高い設計

---

*※ 本リポジトリはポートフォリオ目的で公開しています。実運用の鍵・収集データは含まれません。*
