# tasks.md — 実装計画

> 親プランは `/Users/hamadahiromu/.claude/plans/instagram-log-md-md-effervescent-scroll.md`
> マイルストーン進捗は `STATE.md` を、ファイル単位の履歴は `EDIT_LOG.md` を参照。

---

## M0 準備（完了済）
- [x] `instagram-lab/` スケルトン作成
- [x] `.claude/settings.json` 配置（PostToolUse hook）
- [x] `scripts/log-edit.sh` 配置 + chmod +x
- [x] フック スモークテスト成功（`docs/EDIT_LOG.md` に1行追記確認）
- [x] `CLAUDE.md`, `docs/{STATE,EDIT_LOG,requirements,tasks}.md` 配置

---

## M1 Scaffold（直列）
**ゴール**: `pnpm dev/build/lint/test` がすべて通る空の Next.js プロジェクトになる

- [ ] `pnpm dlx create-next-app@latest .` 相当の初期化（App Router / TS / Tailwind / src dir / no ESLint conflict）
- [ ] 依存追加（並列起動前に親が一括）:
  ```
  pnpm add @anthropic-ai/sdk zod
  pnpm add -D vitest @vitest/coverage-v8 @types/node
  ```
- [ ] `tests/setup.ts` 雛形、`vitest.config.ts` 設定
- [ ] `package.json` に `"test:ci": "vitest run --reporter=json --outputFile=test-results.json"` 追加
- [ ] `.env.example` 作成（実値なし、変数名のみ）
- [ ] `.gitignore` に `data/`, `.env.local`, `test-results.json`, `node_modules/`, `.next/` 含める
- [ ] `pnpm dev` 起動確認 → `http://localhost:3000` 表示
- [ ] `pnpm build` 成功
- [ ] `pnpm lint` 0 エラー
- [ ] STATE.md を「M1完了」に更新 / コミット `chore(m1): scaffold next.js + tailwind`

---

## M2 + M3 + M5（並列・1メッセージで3 Agent起動）

### M2 data-layer
**触るパス（排他）**: `src/lib/brightdata.ts`, `src/app/api/collect/route.ts`, `src/types/post.ts`, `tests/mocks/posts.json`, `tests/unit/brightdata.test.ts`

- [ ] `Post` 型を `src/types/post.ts` で定義（requirements §1 そのまま）
- [ ] `lib/brightdata.ts`: Bright Data API クライアント（dataset_id を引数）
  - Zod スキーマで返値検証
  - **実APIは叩かない**。`fetch` の thin wrapper のみ
- [ ] `src/app/api/collect/route.ts`: POST で `{type, target, hashtag?}` を受け、brightdata クライアントを呼んで `data/*.json` に保存
- [ ] `tests/mocks/posts.json`: 5〜10件のサンプル投稿（reel/feed 混在、followers/likes/views 揃え）
- [ ] `tests/unit/brightdata.test.ts`: `fetch` を `vi.fn()` でモックして wrapper の組み立てを検証

### M3 scoring + taxonomy
**触るパス（排他）**: `src/lib/scoring.ts`, `src/lib/taxonomy.ts`, `src/config/thresholds.ts`, `tests/unit/scoring.test.ts`

- [ ] `src/config/thresholds.ts`: `T_VIEW = 3.0`, `T_JUMP = 2.0` を named export
- [ ] `src/lib/scoring.ts`: 純関数群
  - `accountMedianEngagement(posts: Post[]): number`
  - `viewRatio(post: Post): number | null` (feed/carousel は null)
  - `engagementJump(post: Post, accountMedian: number): number`
  - `score(post: Post, accountMedian: number, t?: {T_VIEW, T_JUMP}): Scored`
- [ ] `src/lib/taxonomy.ts`: フック型 enum 5種 + ビジュアル型 enum 5種 + ヘルパ
- [ ] `tests/unit/scoring.test.ts`:
  - 正常系: view_ratio=5.0 → is_breakout=true
  - 正常系: engagement_jump=1.5 & view_ratio=null → is_breakout=false
  - 境界: T_VIEW=3.0 ちょうど → is_breakout=true
  - エッジ: followers=0, views=0, median=0 のゼロ除算回避
- [ ] **`Post` 型は M2 が定義中なので仮で `import type { Post }` し、合流時に M2 の型に置換**

### M5 ai-integration
**触るパス（排他）**: `src/lib/claude.ts`, `src/app/api/analyze/route.ts`, `src/lib/prompts/voice.ts`, `src/lib/prompts/catalog.ts`, `tests/unit/claude.test.ts`

- [ ] `src/lib/prompts/voice.ts`: requirements §4-A プロンプトを定数 export
- [ ] `src/lib/prompts/catalog.ts`: requirements §4-B プロンプトを定数 export（`brand_name` 引数化）
- [ ] `src/lib/claude.ts`: `@anthropic-ai/sdk` の薄い wrapper
  - `analyzeVoice(comments: string[]): Promise<VoiceAnalysis>`
  - `analyzeCatalog(post: {caption, thumbnail_url}, brandName: string): Promise<CatalogAnalysis>`
  - system プロンプトに `cache_control: {type: "ephemeral"}` 必須
  - model: `claude-sonnet-4-7`
- [ ] `src/app/api/analyze/route.ts`: POST で `{mode: "voice"|"catalog", payload}` を受け、claude.ts に委譲
- [ ] `tests/unit/claude.test.ts`: `@anthropic-ai/sdk` を `vi.mock()` してプロンプト組立と返値パースを検証
- [ ] **Anthropic 実呼び出し禁止**（全てモック）

### 合流（M2/M3/M5 全完了後・直列）
- [ ] `git status` で重複編集なし確認
- [ ] M3 の仮 `Post` 型を M2 のものに切替
- [ ] `pnpm test` 全通
- [ ] `pnpm build` 成功
- [ ] STATE.md 更新 / コミット `feat(m2-m3-m5): data + scoring + ai parallel`

---

## M4 UI（直列）
**触るパス**: `src/app/(ui)/**`, `src/components/**`, `src/app/page.tsx`

- [ ] `src/app/page.tsx`: タブナビゲーション（collect / breakout / catalog / voice）
- [ ] `src/app/(ui)/collect/page.tsx`: 対象選択 → fetch `/api/collect`
- [ ] `src/app/(ui)/breakout/page.tsx`: スコア済み一覧、is_breakout フィルタ、自社ハイライト
- [ ] `src/app/(ui)/catalog/page.tsx`: マトリクス（フック型×ビジュアル型）
- [ ] `src/app/(ui)/voice/page.tsx`: 投稿選択 → fetch `/api/analyze?mode=voice`
- [ ] frontend-design スキル有効化（あれば）
- [ ] サムネは Bright Data の URL を `<img>` で参照（再ホスト禁止）
- [ ] `tests/mocks/posts.json` を読ませて4タブ全て表示確認（agent-browser 推奨）
- [ ] STATE.md 更新 / コミット `feat(m4): 4-tab ui (collect/breakout/catalog/voice)`
