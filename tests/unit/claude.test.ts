/**
 * Unit tests for Claude analyzer wrappers.
 *
 * The Anthropic SDK is fully mocked — no real HTTP calls. We assert on the
 * arguments passed to `messages.create` (cache_control on system, model id,
 * image source structure) and on the JSON parse / error path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the vi.mock factory below (which is itself hoisted) can
// reference these without a TDZ error.
const { createMock, AnthropicCtor } = vi.hoisted(() => {
  const createMockInner = vi.fn();
  const ctor = vi.fn().mockImplementation(() => ({
    messages: { create: createMockInner },
  }));
  return { createMock: createMockInner, AnthropicCtor: ctor };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: AnthropicCtor,
}));

import Anthropic from "@anthropic-ai/sdk";

import {
  analyzeCatalog,
  analyzeVoice,
  ClaudeAnalysisError,
} from "@/lib/claude";
import { buildCatalogPrompt, CATALOG_SYSTEM } from "@/lib/prompts/catalog";
import { buildVoicePrompt, VOICE_SYSTEM } from "@/lib/prompts/voice";

type CreateArgs = Parameters<Anthropic["messages"]["create"]>[0];

function mockText(payload: unknown): void {
  createMock.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(payload) }],
  });
}

function lastArgs(): CreateArgs {
  const calls = createMock.mock.calls;
  return calls[calls.length - 1]![0] as CreateArgs;
}

beforeEach(() => {
  createMock.mockReset();
  AnthropicCtor.mockClear();
});

describe("buildVoicePrompt", () => {
  it("injects comments between triple quotes joined by newline", () => {
    const out = buildVoicePrompt(["美味しそう", "また行きたい"]);
    expect(out).toContain('"""\n美味しそう\nまた行きたい\n"""');
    expect(out).toContain("出力JSON:");
  });

  it("handles an empty comments array", () => {
    expect(buildVoicePrompt([])).toContain('"""\n\n"""');
  });
});

describe("buildCatalogPrompt", () => {
  it("replaces caption and brand_name placeholder", () => {
    const out = buildCatalogPrompt({
      caption: "断面シズル",
      brandName: "Phasera",
    });
    expect(out).toContain("キャプション: 断面シズル");
    expect(out).toContain("これを Phasera の制作に翻訳");
    expect(out).not.toContain("{brand_name}");
    expect(out).not.toContain("{caption}");
  });
});

describe("analyzeVoice", () => {
  it("returns parsed JSON and sends ephemeral-cached system prompt", async () => {
    const payload = {
      surface_needs: [
        {
          category: "ボリューム",
          weight: "高",
          sentiment: "ポジ",
          examples: ["a", "b"],
        },
      ],
      latent_desires: [
        { hypothesis: "罪悪感の解消", evidence: "ヘルシー言及", confidence: "中" },
      ],
      content_implications: ["朝の罪悪感ゼロ訴求"],
    };
    mockText(payload);

    const client = new Anthropic({ apiKey: "test" });
    const result = await analyzeVoice(["美味しそう"], client);

    expect(result).toEqual(payload);
    const args = lastArgs();
    expect(args.model).toBe("claude-sonnet-4-6");
    expect(args.max_tokens).toBe(2000);
    expect(args.system).toEqual([
      {
        type: "text",
        text: VOICE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ]);
    expect(args.messages[0]?.content).toBe(buildVoicePrompt(["美味しそう"]));
  });

  it("throws ClaudeAnalysisError when response is not JSON", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json {{" }],
    });
    await expect(
      analyzeVoice(["x"], new Anthropic({ apiKey: "test" })),
    ).rejects.toBeInstanceOf(ClaudeAnalysisError);
  });

  it("throws ClaudeAnalysisError when no text block is returned", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
    });
    await expect(
      analyzeVoice(["x"], new Anthropic({ apiKey: "test" })),
    ).rejects.toBeInstanceOf(ClaudeAnalysisError);
  });
});

describe("analyzeCatalog", () => {
  it("sends image url and ephemeral-cached system prompt, parses result", async () => {
    const payload = {
      hook_type: "シズル/断面",
      visual_type: "寄り/質感",
      why_stops_scroll: "断面の艶が反射する",
      brand_translation: "Phasera のサラダ断面を寄りで撮る",
    };
    mockText(payload);

    const client = new Anthropic({ apiKey: "test" });
    const result = await analyzeCatalog(
      {
        caption: "断面シズル",
        thumbnailUrl: "https://cdn.example.com/t.jpg",
        brandName: "Phasera",
      },
      client,
    );

    expect(result).toEqual(payload);
    const args = lastArgs();
    expect(args.model).toBe("claude-sonnet-4-6");
    expect(args.max_tokens).toBe(1000);
    expect(args.system).toEqual([
      {
        type: "text",
        text: CATALOG_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ]);

    const content = args.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    const blocks = content as Array<Record<string, unknown>>;
    expect(blocks[0]).toEqual({
      type: "image",
      source: { type: "url", url: "https://cdn.example.com/t.jpg" },
    });
    expect(blocks[1]).toMatchObject({ type: "text" });
    expect((blocks[1] as { text: string }).text).toContain("Phasera");
  });

  it("constructs a default client when none is injected", async () => {
    mockText({
      hook_type: "h",
      visual_type: "v",
      why_stops_scroll: "w",
      brand_translation: "b",
    });
    AnthropicCtor.mockClear();
    await analyzeCatalog({
      caption: "c",
      thumbnailUrl: "https://x/y.jpg",
      brandName: "Phasera",
    });
    expect(AnthropicCtor).toHaveBeenCalledTimes(1);
  });
});
