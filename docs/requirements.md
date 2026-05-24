# requirements.md — instagram-lab

## 0. 何のツールか（背景）

競合アカウントの**平常運転**（既にそのジャンルに興味がある顕在顧客向け）を分析しても新規獲得には繋がらない。本ツールは、**フォロワー数を遥かに超えて拡散した「ブレイク投稿」だけ**を抜き出し、**なぜ通りすがりのユーザーの指を止めたか**を再現可能な語彙（フック型 × ビジュアル型）に分解する。

利用者は**クリエイティブのデザイナー / 運用者**。成果物の核は「数字のランキング」ではなく「**なぜ視線が止まったか**」の分解（再現レシピ）。

### スコープ（確定事項）
- **同ジャンル内**のみ。異ジャンルのデザインは再現できないので対象外
- **競合込み込み**。ただし競合は"真似る対象"ではなく**「ヒットの瞬間のサンプル提供者」**として扱う。平常運転は無視

### 対象（初期 / `src/config/accounts.ts` で外部編集）
- 食ジャンルなら例: `withgreen_official`, `crispsaladworks`, `greenbrothers025`, `guzmanygomezjp`
- ハッシュタグ例: `#タンパク`, `#プロテイン`, `#サラダボウル`, `#東京ランチ`
- 他案件転用は config 差し替えのみ（CLAUDE.md / コードを触らない）

### Non-Goals
- 保存数・シェア・リーチの取得（公開されておらず物理的に不可。代理指標で推定する）
- 異ジャンルの収集
- 投稿の自動生成・自動投稿（型の提示まで、制作と投稿は人間）

---

## 1. データスキーマ（`src/types/`）

```ts
type MediaType = "reel" | "feed" | "carousel";

interface Post {
  account: string;
  followers: number;
  type: MediaType;
  likes: number;
  comments: number;        // 件数
  views?: number;          // reel のみ
  caption: string;
  hashtags: string[];
  date: string;            // YYYY-MM-DD
  post_url: string;
  thumbnail_url: string;   // 表示用（再ホストしない）
  comment_texts?: string[];// 声分析用（commentsエンドポイントで別取得）
}

interface Scored extends Post {
  view_ratio: number | null;     // views / followers
  engagement_jump: number;       // (likes+comments) / account_median_engagement
  is_breakout: boolean;
}
```

---

## 2. スコアリング（`lib/scoring.ts`・純関数）

```
account_median_engagement = median( likes+comments over that account's posts )
view_ratio       = views / followers            // reel のみ
engagement_jump  = (likes+comments) / account_median_engagement
is_breakout      = (view_ratio >= T_VIEW) || (engagement_jump >= T_JUMP)
```
- `T_VIEW` default 3.0 / `T_JUMP` default 2.0（`config/thresholds.ts` で可変、UIスライダで調整可だと尚良）
- **重要**: これは「フォロワー外に届いた可能性が高い」の代理判定。UI/出力で「バズった」と断定せず「**ブレイク候補（推定）**」と表記する。

---

## 3. 機能（4タブ）

### ① 収集 Collect
- 対象アカウント・ハッシュタグを選んで Bright Data 取得をトリガ → `data/*.json` に保存
- 取得状況（件数・最終取得日時）を表示。**実呼び出しは明示ボタン**（後課金のため）

### ② ブレイク検出 Breakout
- スコアリング済みの一覧、`is_breakout` でフィルタ/ソート
- 各投稿: サムネ・view_ratio・engagement_jump・キャプション・post_url
- 自社（対象ブランド）はハイライト

### ③ 型カタログ Catalog（コア）
- ブレイク投稿を Claude(vision) で「フック型 × ビジュアル型」に分解
- マトリクス表示（どの型が今効いているか）/ 各列の**再現レシピ**（対象ブランド版への翻訳例つき）

### ④ 声分析 Voice
- ブレイク投稿のコメント本文 → Claude で 顕在ニーズ / 潜在欲求[要検証] / 投稿への示唆
- 潜在欲求は**必ず仮説扱い**（`要検証`バッジ）

---

## 4. Claude プロンプト（実装にそのまま使う）

### 4-A. 声分析（`/api/analyze` 声）
```
あなたは飲食店のSNSコメント分析の専門家です。以下は食ジャンルのInstagram投稿に寄せられたコメント群です。分析し、必ず指定JSONのみで出力（前置き・コードフェンス禁止）。
コメント:
"""
{comments}
"""
出力JSON:
{
  "surface_needs":[{"category":"短い名","weight":"高|中|低","sentiment":"ポジ|ネガ|中立","examples":["抜粋","抜粋"]}],
  "latent_desires":[{"hypothesis":"明示されない潜在欲求","evidence":"推論根拠","confidence":"高|中|低"}],
  "content_implications":["投稿に活かす具体アクション"]
}
ルール: surface最大6/latent最大4(必ず仮説)/implications最大4/examplesは2、日本語。
```

### 4-B. 型分解（`/api/analyze` 型・vision）
```
あなたはSNSフィードのクリエイティブ・ディレクターです。次の投稿（1枚目画像＋キャプション）がなぜ"フォロワー外の初見ユーザーの指を止め得たか"を分解してください。必ず指定JSONのみ。
キャプション: {caption}
（画像は thumbnail を image ブロックで添付）
出力JSON:
{
  "hook_type":"意外性/常識破壊|保存性/ハック|シズル/断面|数字/ランキング|ローカル/地名",
  "visual_type":"1枚目文字量|高コントラスト/色数|寄り/質感|人の気配|スケール/インパクト",
  "why_stops_scroll":"視線が止まる理由（1-2文）",
  "brand_translation":"これを {brand_name} の制作に翻訳した具体案（1-2文、brand_name は実行時引数）"
}
```
- model: `claude-sonnet-4-6`（現行最新Sonnet）。サーバー側で `ANTHROPIC_API_KEY` 使用。
- system プロンプトに ephemeral cache を設定（プロンプトキャッシュ必須）。

---

## 5. UI / UX・デザイン方針
- **frontend-design スキルがあれば必ず使用**。無ければ CLAUDE.md の Design 原則。
- トーン: 食 × エディトリアル。温かみのある彩度アクセント（オリ/ライム/ナサ系）。ダーク基調も可、汎用SaaS見えを避ける。
- 情報設計: 4タブをデザイナーが**順に選んで作業するゴール**。型カタログは*視覚的*に（サムネ + ラベル + レシピ）。
- フォント: 表示用は個性的に（Inter禁止）。日本語Webフォント必須（Zen系等）。
- レスポンシブ。サムネはグリッド。読み込み中はスケルトン。

---

## 6. 環境変数（`.env.local`・コミット禁止）
```
BRIGHT_DATA_API_KEY=...
BRIGHT_DATA_DATASET_POSTS=gd_...
BRIGHT_DATA_DATASET_REELS=gd_...
BRIGHT_DATA_DATASET_COMMENTS=gd_lyclm20il4r5helnj   # 要コンソール確認
BRIGHT_DATA_DATASET_HASHTAG=gd_...
ANTHROPIC_API_KEY=...
```

## 7. 未決定（人間が埋める / 生成前に確認）
- 各 Bright Data `dataset_id`（コンソールで確認して `.env` へ）
- 閾値 `T_VIEW` / `T_JUMP` の初期値（まず3.0 / 2.0で動かして調整）
- ストレージはJSONのままか、件数増えたらDB化か
- 対象ブランド（`brand_name` プロンプト引数）の初期値
