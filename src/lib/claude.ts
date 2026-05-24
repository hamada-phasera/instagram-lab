/**
 * Anthropic Claude client wrappers for instagram-lab.
 *
 * Two narrow helpers — `analyzeVoice` (comments → needs/desires) and
 * `analyzeCatalog` (caption + thumbnail → hook/visual breakdown). Both
 * accept an optional pre-built `Anthropic` instance so tests can inject a
 * mock without touching `process.env.ANTHROPIC_API_KEY`.
 *
 * Server-only. Never import this from a client component.
 */

import Anthropic from "@anthropic-ai/sdk";

import { buildCatalogPrompt, CATALOG_SYSTEM } from "./prompts/catalog";
import { buildVoicePrompt, VOICE_SYSTEM } from "./prompts/voice";

const MODEL = "claude-sonnet-4-6";

export class ClaudeAnalysisError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ClaudeAnalysisError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export type VoiceAnalysis = {
  surface_needs: Array<{
    category: string;
    weight: "高" | "中" | "低";
    sentiment: "ポジ" | "ネガ" | "中立";
    examples: string[];
  }>;
  latent_desires: Array<{
    hypothesis: string;
    evidence: string;
    confidence: "高" | "中" | "低";
  }>;
  content_implications: string[];
};

export type CatalogAnalysis = {
  hook_type: string;
  visual_type: string;
  why_stops_scroll: string;
  brand_translation: string;
};

function getClient(client?: Anthropic): Anthropic {
  return client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function extractText(message: { content: ReadonlyArray<unknown> }): string {
  const first = message.content[0];
  if (
    first &&
    typeof first === "object" &&
    "type" in first &&
    (first as { type: unknown }).type === "text" &&
    "text" in first &&
    typeof (first as { text: unknown }).text === "string"
  ) {
    return (first as { text: string }).text;
  }
  throw new ClaudeAnalysisError("Claude response had no text block");
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new ClaudeAnalysisError("Failed to parse Claude JSON response", {
      cause,
    });
  }
}

export async function analyzeVoice(
  comments: string[],
  client?: Anthropic,
): Promise<VoiceAnalysis> {
  const anthropic = getClient(client);
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: VOICE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildVoicePrompt(comments) }],
  });
  return parseJson<VoiceAnalysis>(extractText(response));
}

export async function analyzeCatalog(
  args: { caption: string; thumbnailUrl: string; brandName: string },
  client?: Anthropic,
): Promise<CatalogAnalysis> {
  const anthropic = getClient(client);
  const prompt = buildCatalogPrompt({
    caption: args.caption,
    brandName: args.brandName,
  });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: [
      {
        type: "text",
        text: CATALOG_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: args.thumbnailUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return parseJson<CatalogAnalysis>(extractText(response));
}
