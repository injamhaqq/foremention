import { extractUrls, ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderAnswer, type ProviderPrompt } from "@/lib/providers/types";

export const perplexityAdapter: AnswerProviderAdapter = {
  id: "perplexity",
  configured: () => Boolean(process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_MODEL),
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const started = Date.now();
    const response = await fetch("https://api.perplexity.ai/v1/sonar", {
      method: "POST",
      signal: options.signal,
      headers: { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.PERPLEXITY_MODEL, max_tokens: options.maxOutputTokens, messages: [{ role: "user", content: prompt.text }] }),
    });
    const raw = (await response.json()) as {
      id?: string;
      model?: string;
      citations?: string[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: { total_cost?: number } };
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
    };
    if (!response.ok) throw new ProviderRequestError("Perplexity", response.status);
    const answer = raw.choices?.[0]?.message?.content || "";
    const citations = (raw.citations || []).map((url) => ({ url }));
    const normalizedCitations = citations.length ? citations : extractUrls(answer);
    const usage = raw.usage ? { inputTokens: raw.usage.prompt_tokens, outputTokens: raw.usage.completion_tokens, totalTokens: raw.usage.total_tokens } : undefined;
    return {
      provider: "perplexity",
      model: raw.model || process.env.PERPLEXITY_MODEL || "configured model",
      promptId: prompt.promptId,
      answer,
      citations: normalizedCitations,
      raw: { id: raw.id, model: raw.model, finishReason: raw.choices?.[0]?.finish_reason, usage, citationCount: normalizedCitations.length },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      billedCostUsd: typeof raw.usage?.cost?.total_cost === "number" ? raw.usage.cost.total_cost : undefined,
      requestId: requestIdFrom(response, raw.id),
      finishReason: raw.choices?.[0]?.finish_reason,
    };
  },
};
