/**
 * Genre × seed mapping for Instagram trend discovery.
 *
 * Two collection modes, batch-triggered from `/collect`:
 *   - **account discovery** (primary): `instagram-posts-discover-by-url`
 *     (`BRIGHT_DATA_DATASET_DISCOVER`), ~12 recent posts per profile URL.
 *   - **hashtag discovery** (dormant): empirically unavailable on this
 *     account's Bright Data datasets (2026-08-24 smoke test — see
 *     scripts/smoke-hashtag.mjs header). The UI disables the mode until a
 *     dedicated hashtag scraper's dataset id is set in
 *     `BRIGHT_DATA_DATASET_HASHTAG`; `hashtags` stays display-only.
 *
 * `/trending` ranks the union by EPH/reach/genre-rank. Note: hashtag-
 * discovered rows usually lack `followers`, so their reach_proxy falls to 0
 * and scoring leans on EPH + genre rank.
 *
 * Edit per project: replace `hashtags`/`accounts` with the tags and
 * brands you actually want to discover within each genre.
 */

export interface Genre {
  /** Display name (Japanese OK). */
  name: string;
  /** Instagram usernames (without @). Profile URLs are derived: https://www.instagram.com/{username}/ */
  accounts: string[];
  /** Hashtags (with or without `#`) used as hashtag-discovery inputs. */
  hashtags: string[];
  /** One-line description shown in the UI. */
  note?: string;
}

export const GENRES: Genre[] = [
  {
    name: "メキシカン",
    note: "ブリトー・タコス等のメキシカン（FRIJOLES のホームジャンル）",
    // Verified official handles (2026-08-24, cross-checked against each
    // brand's own site / listing): FRIJOLES 自社（ベンチマーク）, タコベル日本,
    // Guzman y Gomez 日本, 北出タコス グランスタ東京.
    accounts: ["frijolesburritostacos", "tacobelljp", "guzmanygomezjp", "kitade_tacos_tokyost"],
    hashtags: ["#ブリトー", "#タコス", "#メキシコ料理", "#メキシカン", "#burrito"],
  },
  {
    name: "飲食",
    note: "日本の飲食店（店紹介・グルメ発見系。レシピ動画メディアは除外）",
    accounts: ["muni_gurume_japan", "tokyogourmet3", "ma_sa_cafe", "tokyo_highcosper_gourmet"],
    hashtags: ["#東京グルメ", "#ランチ", "#カフェ巡り", "#ディナー", "#飯テロ"],
  },
  {
    name: "ソフトウェア",
    note: "エンジニア・プログラミング系",
    accounts: ["github", "vercel", "nextjs", "reactjs", "vscode"],
    hashtags: ["#エンジニア", "#プログラミング", "#devops", "#programming", "#softwareengineer"],
  },
  {
    name: "ファッション",
    note: "コーディネート・スタイル系",
    accounts: ["voguemagazine", "gq", "highsnobiety", "ootdmagazine", "complexstyle"],
    hashtags: ["#ootd", "#fashion", "#コーディネート", "#outfit", "#fashionstyle"],
  },
  {
    name: "旅行",
    note: "国内外の旅行・観光系",
    accounts: ["natgeotravel", "lonelyplanet", "beautifuldestinations", "traveldeeper", "earthpix"],
    hashtags: ["#旅行", "#travel", "#trip", "#wanderlust", "#旅行好きな人と繋がりたい"],
  },
  {
    name: "ライフスタイル",
    note: "暮らし・日常系",
    accounts: ["muji_global", "kinfolk", "apartmenttherapy", "monocle", "thisiscolossal"],
    hashtags: ["#ライフスタイル", "#lifestyle", "#暮らし", "#日常", "#丁寧な暮らし"],
  },
];

export function findGenre(name: string): Genre | undefined {
  return GENRES.find((g) => g.name === name);
}

/**
 * Find the genre that owns the given account username (case-insensitive, ignores leading @).
 */
export function findGenreByAccount(username: string): Genre | undefined {
  const norm = username.replace(/^@/, "").toLowerCase();
  return GENRES.find((g) =>
    g.accounts.some((a) => a.toLowerCase() === norm),
  );
}

/**
 * Find the genre that owns the given hashtag. Used both to route freshly
 * hashtag-discovered posts and for older snapshots persisted with
 * `source_hashtag`. Case-insensitive, ignores leading `#`. Returns
 * undefined when the hashtag is not registered.
 */
export function findGenreByHashtag(hashtag: string): Genre | undefined {
  const norm = hashtag.replace(/^#/, "").toLowerCase();
  return GENRES.find((g) =>
    g.hashtags.some((h) => h.replace(/^#/, "").toLowerCase() === norm),
  );
}
