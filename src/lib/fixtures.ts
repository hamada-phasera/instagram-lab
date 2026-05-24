import { promises as fs } from "node:fs";
import path from "node:path";
import type { Post } from "@/types/post";

const FIXTURE = path.join(process.cwd(), "tests/mocks/posts.json");

export async function loadMockPosts(): Promise<Post[]> {
  const raw = await fs.readFile(FIXTURE, "utf8");
  return JSON.parse(raw) as Post[];
}
