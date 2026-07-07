/**
 * Genre × seed-account mapping for Instagram trend discovery.
 *
 * Bright Data does NOT expose a hashtag discovery scraper in its public docs.
 * The available endpoint is `instagram-posts-discover-by-url` which takes
 * **profile URLs** as input and returns recent posts from each profile.
 *
 * MVP strategy: per genre, curate ~5 representative accounts. `/collect`
 * batch-triggers discover-by-url for each account, then `/trending` ranks
 * the union by EPH/reach/genre-rank.
 *
 * Edit per project: replace `accounts` with the brands/influencers you
 * actually want to discover within each genre. `hashtags` is kept for UI
 * display only (not used to drive collection).
 */

export interface Genre {
  /** Display name (Japanese OK). */
  name: string;
  /** Instagram usernames (without @). Profile URLs are derived: https://www.instagram.com/{username}/ */
  accounts: string[];
  /** Display-only hashtags (formerly used to drive collection — now informational). */
  hashtags: string[];
  /** One-line description shown in the UI. */
  note?: string;
}

export const GENRES: Genre[] = [
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
 * Find the genre that owns the given hashtag (kept for compat with older
 * snapshots persisted with `source_hashtag`). Case-insensitive, ignores
 * leading `#`. Returns undefined when the hashtag is not registered.
 */
export function findGenreByHashtag(hashtag: string): Genre | undefined {
  const norm = hashtag.replace(/^#/, "").toLowerCase();
  return GENRES.find((g) =>
    g.hashtags.some((h) => h.replace(/^#/, "").toLowerCase() === norm),
  );
}
