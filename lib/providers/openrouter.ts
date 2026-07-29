import {
  ProviderRequestError,
  requestIdFrom,
  type AnswerProviderAdapter,
  type ProviderAnswer,
  type ProviderPrompt,
} from "@/lib/providers/types";

type OpenRouterResponse = {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  error?: { message?: string };
};

export const openRouterAdapter: AnswerProviderAdapter = {
  id: "openrouter",
  configured: () => Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL),
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = String(process.env.OPENROUTER_MODEL);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: options.signal,
      headers: {
        authorization: `Bearer ${String(process.env.OPENROUTER_API_KEY)}`,
        "content-type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://foremention.com",
        "X-OpenRouter-Title": "Foremention",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxOutputTokens,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Answer the buyer question directly and concisely. This collection has no live web research. Do not invent citations, URLs, companies, product claims, or current facts. State uncertainty when evidence is unavailable.",
          },
          { role: "user", content: prompt.text },
        ],
      }),
    });
    const raw = await response.json().catch(() => ({})) as OpenRouterResponse;
    if (!response.ok) throw new ProviderRequestError("OpenRouter", response.status, raw.error?.message);

    const answer = raw.choices?.[0]?.message?.content?.trim() || "";
    if (!answer) throw new ProviderRequestError("OpenRouter", 502, "The selected model returned no answer text.");
    const usage = raw.usage ? {
      inputTokens: raw.usage.prompt_tokens,
      outputTokens: raw.usage.completion_tokens,
      totalTokens: raw.usage.total_tokens,
    } : undefined;
    const finishReason = raw.choices?.[0]?.finish_reason;

    return {
      provider: "openrouter",
      model: raw.model || model,
      promptId: prompt.promptId,
      answer,
      citations: [],
      raw: {
        id: raw.id,
        model: raw.model || model,
        routedProvider: raw.provider,
        grounded: false,
        citationCount: 0,
        finishReason,
        usage,
      },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      billedCostUsd: typeof raw.usage?.cost === "number" ? raw.usage.cost : undefined,
      requestId: requestIdFrom(response, raw.id),
      finishReason,
    };
  },
};
