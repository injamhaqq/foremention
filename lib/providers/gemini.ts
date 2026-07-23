import { extractUrls, type AnswerProviderAdapter, type ProviderAnswer, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";

type GeminiResponse = {
  modelVersion?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
};

export const geminiAdapter: AnswerProviderAdapter = {
  id: "gemini",
  configured: () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
  async run(prompt: ProviderPrompt): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = String(process.env.GEMINI_MODEL);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": String(process.env.GEMINI_API_KEY), "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt.text }] }],
        tools: [{ google_search: {} }],
      }),
    });
    const raw = (await response.json()) as GeminiResponse;
    if (!response.ok) throw new Error(`Gemini adapter failed (${response.status}).`);
    const candidate = raw.candidates?.[0];
    const answer = (candidate?.content?.parts || []).map((part) => part.text || "").join("\n");
    const citations: ProviderCitation[] = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
      .map((web) => ({ url: web.uri, title: web.title }));
    return {
      provider: "gemini",
      model: raw.modelVersion || model,
      promptId: prompt.promptId,
      answer,
      citations: citations.length ? citations : extractUrls(answer),
      raw,
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
    };
  },
};
