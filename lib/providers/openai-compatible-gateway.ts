import {
  ProviderRequestError,
  requestIdFrom,
  type AnswerProviderAdapter,
  type ProviderAnswer,
  type ProviderCitation,
  type ProviderId,
  type ProviderPrompt,
} from "@/lib/providers/types";

type GatewayProviderId = Extract<ProviderId, "zenmux" | "omniroute" | "omnirouters">;

type GatewayAnnotation = {
  url?: string;
  title?: string;
  url_citation?: {
    url?: string;
    title?: string;
    start_index?: number;
    end_index?: number;
  };
};

type GatewayResponse = {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string; annotations?: GatewayAnnotation[] };
  }>;
  citations?: Array<string | { url?: string; title?: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  error?: { message?: string };
};

type GatewayConfig = {
  id: GatewayProviderId;
  label: string;
  endpoint?: string;
  baseUrlEnv?: "OMNIROUTE_BASE_URL";
  apiKeyEnv: "ZENMUX_API_KEY" | "OMNIROUTE_API_KEY" | "OMNIROUTERS_API_KEY";
  modelEnv: "ZENMUX_MODEL" | "OMNIROUTE_MODEL" | "OMNIROUTERS_MODEL";
  maxTokensField: "max_tokens" | "max_completion_tokens";
};

function resolveGatewayEndpoint(config: GatewayConfig) {
  if (config.endpoint) return config.endpoint;
  if (!config.baseUrlEnv) return null;
  const rawBaseUrl = process.env[config.baseUrlEnv]?.trim();
  if (!rawBaseUrl) return null;
  try {
    const url = new URL(rawBaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
    if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || loopback)) return null;
    url.search = "";
    url.hash = "";
    const base = url.toString().replace(/\/+$/, "");
    return `${base}/chat/completions`;
  } catch {
    return null;
  }
}

function safeCitation(urlValue: unknown, title?: unknown, startIndex?: unknown, endIndex?: unknown): ProviderCitation | null {
  if (typeof urlValue !== "string") return null;
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      url: url.toString(),
      title: typeof title === "string" && title.trim() ? title.trim() : undefined,
      startIndex: typeof startIndex === "number" ? startIndex : undefined,
      endIndex: typeof endIndex === "number" ? endIndex : undefined,
    };
  } catch {
    return null;
  }
}

function structuredCitations(raw: GatewayResponse) {
  const fromAnnotations = (raw.choices?.[0]?.message?.annotations || []).map((annotation) => {
    const citation = annotation.url_citation;
    return safeCitation(
      citation?.url || annotation.url,
      citation?.title || annotation.title,
      citation?.start_index,
      citation?.end_index,
    );
  });
  const fromTopLevel = (raw.citations || []).map((citation) => (
    typeof citation === "string" ? safeCitation(citation) : safeCitation(citation.url, citation.title)
  ));
  const unique = new Map<string, ProviderCitation>();
  for (const citation of [...fromAnnotations, ...fromTopLevel]) {
    if (citation) unique.set(citation.url, citation);
  }
  return Array.from(unique.values());
}

export function createOpenAiCompatibleGateway(config: GatewayConfig): AnswerProviderAdapter {
  return {
    id: config.id,
    configured: () => Boolean(process.env[config.apiKeyEnv] && process.env[config.modelEnv] && resolveGatewayEndpoint(config)),
    async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
      const started = Date.now();
      const model = String(process.env[config.modelEnv]);
      const endpoint = resolveGatewayEndpoint(config);
      if (!endpoint) throw new ProviderRequestError(config.label, 503, "Gateway endpoint is not configured safely.");
      const response = await fetch(endpoint, {
        method: "POST",
        signal: options.signal,
        headers: {
          authorization: `Bearer ${String(process.env[config.apiKeyEnv])}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          [config.maxTokensField]: options.maxOutputTokens,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "Answer the buyer question directly and concisely. Do not invent citations, URLs, companies, product claims, or current facts. Only structured URLs returned by the provider are recorded as citations. State uncertainty when evidence is unavailable.",
            },
            { role: "user", content: prompt.text },
          ],
        }),
      });
      const raw = await response.json().catch(() => ({})) as GatewayResponse;
      if (!response.ok) throw new ProviderRequestError(config.label, response.status, raw.error?.message);

      const answer = raw.choices?.[0]?.message?.content?.trim() || "";
      if (!answer) throw new ProviderRequestError(config.label, 502, "The selected model returned no answer text.");
      const usage = raw.usage ? {
        inputTokens: raw.usage.prompt_tokens,
        outputTokens: raw.usage.completion_tokens,
        totalTokens: raw.usage.total_tokens,
      } : undefined;
      const finishReason = raw.choices?.[0]?.finish_reason;
      const citations = structuredCitations(raw);

      return {
        provider: config.id,
        model: raw.model || model,
        promptId: prompt.promptId,
        answer,
        citations,
        raw: {
          id: raw.id,
          model: raw.model || model,
          routedProvider: raw.provider,
          grounded: citations.length > 0,
          citationCount: citations.length,
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
}
