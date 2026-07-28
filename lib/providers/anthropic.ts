import { extractUrls, ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderAnswer, type ProviderPrompt } from "@/lib/providers/types";

export const anthropicAdapter: AnswerProviderAdapter = {
  id: "anthropic",
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL),
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const started = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: options.signal,
      headers: { "x-api-key": String(process.env.ANTHROPIC_API_KEY), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: options.maxOutputTokens,
        tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 3, allowed_callers: ["direct"] }],
        messages: [{ role: "user", content: `${prompt.text}\n\nUse web-accessible evidence when available and include source URLs.` }],
      }),
    });
    const raw = (await response.json()) as {
      id?: string;
      model?: string;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      content?: Array<{ type: string; text?: string; citations?: Array<{ type?: string; url?: string; title?: string }> }>;
    };
    if (!response.ok) throw new ProviderRequestError("Anthropic", response.status);
    const answer = (raw.content || []).map((item) => item.text || "").join("\n");
    const suppliedCitations = (raw.content || []).flatMap((item) => item.citations || []).filter((citation) => Boolean(citation.url)).map((citation) => ({ url: citation.url!, title: citation.title }));
    const citations = suppliedCitations.length ? suppliedCitations : extractUrls(answer);
    const usage = raw.usage ? {
      inputTokens: raw.usage.input_tokens,
      outputTokens: raw.usage.output_tokens,
      totalTokens: (raw.usage.input_tokens || 0) + (raw.usage.output_tokens || 0),
    } : undefined;
    return {
      provider: "anthropic",
      model: raw.model || process.env.ANTHROPIC_MODEL || "configured model",
      promptId: prompt.promptId,
      answer,
      citations,
      raw: { id: raw.id, model: raw.model, stopReason: raw.stop_reason, usage, citationCount: citations.length },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response, raw.id),
      finishReason: raw.stop_reason,
    };
  },
};
