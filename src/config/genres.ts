/**
 * Genre × hashtag mapping for Instagram trend discovery.
 *
 * Each genre groups hashtags that target the same audience / topic cluster.
 * `/collect` triggers Bright Data hashtag scraper for every hashtag in a genre,
 * then `/trending` aggregates results cross-tag inside the genre.
 *
 * Edit per project: add/remove genres and tune the hashtag set for each.
 */

export interface Genre {
  /** Display name (Japanese OK). */
  name: string;
  /** Hashtags with leading `#`. Bright Data input strips the `#`. */
  hashtags: string[];
  /** One-line description shown in the UI. */
  note?: string;
}

export const GENRES: Genre[] = [
  {
    name: "飲食",
    note: "ランチ・カフェ・グルメ系",
    hashtags: ["#ランチ", "#グルメ", "#カフェ", "#foodporn", "#lunch"],
  },
  {
    name: "ソフトウェア",
    note: "エンジニア・プログラミング系",
    hashtags: [
      "#エンジニア",
      "#プログラミング",
      "#devops",
      "#programming",
      "#softwareengineer",
    ],
  },
  {
    name: "ファッション",
    note: "コーディネート・スタイル系",
    hashtags: ["#ootd", "#fashion", "#コーディネート", "#outfit", "#fashionstyle"],
  },
  {
    name: "旅行",
    note: "国内外の旅行・観光系",
    hashtags: ["#旅行", "#travel", "#trip", "#旅行好きな人と繋がりたい", "#wanderlust"],
  },
  {
    name: "ライフスタイル",
    note: "暮らし・日常系",
    hashtags: ["#ライフスタイル", "#lifestyle", "#暮らし", "#日常", "#丁寧な暮らし"],
  },
];

export function findGenre(name: string): Genre | undefined {
  return GENRES.find((g) => g.name === name);
}
