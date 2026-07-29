import { extractUrls, ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderAnswer, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";

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
    const model = String(process.env.GEMINI_MODEL);
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
      if (response.ok) throw new Error("Gemini returned an unreadable success response.");
    }
    if (!response.ok) {
      const statusLabel = raw.error?.status?.trim();
      const message = raw.error?.message?.trim();
      const detail = [statusLabel ? `[${statusLabel}]` : "", message || ""].filter(Boolean).join(" ");
      throw new ProviderRequestError("Gemini", response.status, detail);
    }
    const candidate = raw.candidates?.[0];
    const answer = (candidate?.content?.parts || []).map((part) => part.text || "").join("\n");
    const citations: ProviderCitation[] = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
      .map((web) => ({ url: web.uri, title: web.title }));
    const normalizedCitations = citations.length ? citations : extractUrls(answer);
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
      citations: normalizedCitations,
      raw: { model: raw.modelVersion || model, finishReason: candidate?.finishReason, usage, citationCount: normalizedCitations.length },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response),
      finishReason: candidate?.finishReason,
    };
  },
};
