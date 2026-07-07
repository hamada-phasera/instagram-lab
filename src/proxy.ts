/**
 * Site-wide HTTP Basic Auth gate (Next.js 16 `proxy` convention).
 *
 * Hobby プランでは Vercel Authentication が本番ドメインを保護できないため、
 * 課金 API (/api/collect, /api/analyze) を含む全ルートをコード側でロックする。
 *
 * 有効化条件: `SITE_BASIC_AUTH_USER` と `SITE_BASIC_AUTH_PASSWORD` が両方 set。
 * 片方でも未設定なら素通り（ローカル dev は env を置かない → ゲート無効）。
 * 本番 Vercel env にのみ両者を登録して production を保護する。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest): NextResponse {
  const user = process.env.SITE_BASIC_AUTH_USER;
  const pass = process.env.SITE_BASIC_AUTH_PASSWORD;

  // Gate disabled when creds are not configured (local dev / preview).
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice("Basic ".length));
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="instagram-lab", charset="UTF-8"',
    },
  });
}

/**
 * Protect everything except Next.js static assets and the favicon.
 * Pages AND API routes are gated (full lock).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
