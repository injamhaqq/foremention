import { configuredGeminiModel } from "@/lib/free-provider-mode";
import { ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderAnswer, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";

type GeminiResponse = {
  modelVersion?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
};

export const geminiAdapter: AnswerProviderAdapter = {
  id: "gemini",
  configured: () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = configuredGeminiModel();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: options.signal,
      headers: { "x-goog-api-key": String(process.env.GEMINI_API_KEY), "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt.text }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: options.maxOutputTokens },
      }),
    });
    const responseText = await response.text();
    let raw: GeminiResponse = {};
    try {
      raw = responseText ? JSON.parse(responseText) as GeminiResponse : {};
    } catch {
      if (response.ok) throw new ProviderRequestError("Gemini", 502, "Grounded response body was unreadable.");
    }
    if (!response.ok) {
      const statusLabel = raw.error?.status?.trim();
      const message = raw.error?.message?.trim();
      const detail = [statusLabel ? `[${statusLabel}]` : "", message || ""].filter(Boolean).join(" ");
      throw new ProviderRequestError("Gemini", response.status, detail);
    }
    const candidate = raw.candidates?.[0];
    const answer = (candidate?.content?.parts || []).map((part) => part.text || "").join("\n").trim();
    if (!answer) throw new ProviderRequestError("Gemini", 502, "Grounded response returned no answer text.");

    const citations: ProviderCitation[] = Array.from(new Map(
      (candidate?.groundingMetadata?.groundingChunks || [])
        .map((chunk) => chunk.web)
        .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
        .map((web) => [web.uri, { url: web.uri, title: web.title }]),
    ).values());
    if (!citations.length) {
      throw new ProviderRequestError("Gemini", 502, "Grounded response returned no provider citation metadata.");
    }

    const usage = raw.usageMetadata ? {
      inputTokens: raw.usageMetadata.promptTokenCount,
      outputTokens: raw.usageMetadata.candidatesTokenCount,
      totalTokens: raw.usageMetadata.totalTokenCount,
    } : undefined;
    return {
      provider: "gemini",
      model: raw.modelVersion || model,
      promptId: prompt.promptId,
      answer,
      citations,
      raw: { model: raw.modelVersion || model, finishReason: candidate?.finishReason, usage, citationCount: citations.length },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response),
      finishReason: candidate?.finishReason,
    };
  },
};
