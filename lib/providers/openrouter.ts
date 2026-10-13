import {
  ProviderRequestError,
  requestIdFrom,
  type AnswerProviderAdapter,
  type ProviderAnswer,
  type ProviderPrompt,
} from "@/lib/providers/types";
import {
  assessGatewayRoutedResponse,
  gatewayMeasurementPin,
  openRouterProviderRouting,
} from "@/lib/measurement-lane.mjs";

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
    // Lane A: the upstream host must be pinned. Without OPENROUTER_UPSTREAM_PROVIDER
    // and an exact non-routing model id, OpenRouter is not a measurement provider.
    const pin = gatewayMeasurementPin("openrouter", process.env);
    if (!pin.pinned) {
      throw new ProviderRequestError("OpenRouter", 422, `Measurement requires an exact pinned upstream provider and model (${pin.reason}).`);
    }
    const model = pin.model;
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
        provider: openRouterProviderRouting(pin),
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

    const routing = assessGatewayRoutedResponse(pin, { model: raw.model, provider: raw.provider });
    if (!routing.ok) {
      throw new ProviderRequestError("OpenRouter", 422, `The response was not served by the pinned upstream provider and model (${routing.reason}); it is not comparable measurement evidence.`);
    }
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
        pinnedUpstreamProvider: pin.upstreamProvider,
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
