/**
 * POST /api/analyze — dispatches to Claude voice or catalog analyzers.
 *
 * Body shape:
 *   { mode: "voice",   payload: { comments: string[] } }
 *   { mode: "catalog", payload: { caption, thumbnailUrl, brandName } }
 *
 * Guards against accidental real-API calls: returns 503 when
 * `ANTHROPIC_API_KEY` is missing. All Claude calls are server-side; we
 * never proxy the key to the client.
 */

import { NextResponse } from "next/server";

import {
  analyzeCatalog,
  analyzeVoice,
  type CatalogAnalysis,
  type VoiceAnalysis,
} from "@/lib/claude";

export const runtime = "nodejs";

type VoiceBody = { mode: "voice"; payload: { comments: string[] } };
type CatalogBody = {
  mode: "catalog";
  payload: { caption: string; thumbnailUrl: string; brandName: string };
};
type AnalyzeBody = VoiceBody | CatalogBody;

function isVoiceBody(body: AnalyzeBody): body is VoiceBody {
  return body.mode === "voice";
}

function isCatalogBody(body: AnalyzeBody): body is CatalogBody {
  return body.mode === "catalog";
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  try {
    if (isVoiceBody(body)) {
      const data: VoiceAnalysis = await analyzeVoice(body.payload.comments);
      return NextResponse.json({ ok: true, data });
    }
    if (isCatalogBody(body)) {
      const data: CatalogAnalysis = await analyzeCatalog(body.payload);
      return NextResponse.json({ ok: true, data });
    }
    return NextResponse.json(
      { ok: false, error: "Unknown mode" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown analyzer error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
