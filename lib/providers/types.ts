import { redactOperationalText } from "../operational-error.js";

export type ProviderId = "openai" | "gemini" | "anthropic" | "perplexity" | "groq" | "cloudflare" | "openrouter" | "zenmux" | "omnirouters" | "mock";

export type ProviderPrompt = {
  promptId: string;
  text: string;
  locale?: string;
};

export type ProviderCitation = {
  url: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
};

/**
 * A URL the model wrote inside its own answer text. This is NOT a citation and
 * NOT evidence: the provider did not return it as a grounding/search source, so
 * it may be invented, stale or paraphrased. Keep it strictly separate from
 * `ProviderAnswer.citations`; it must never feed sources, citation counts,
 * source maps or evidence review.
 */
export type ModelMentionedUrl = {
  url: string;
};

export type ProviderUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type ProviderSpendBudget = {
  runSpendSoFarUsd: number;
  monthlySpendSoFarUsd: number;
  runLimitUsd: number;
  monthlyLimitUsd: number;
};

export type ProviderAnswer = {
  provider: ProviderId;
  model: string;
  promptId: string;
  answer: string;
  /** Only structured citations the provider API itself returned. Never URLs scraped from answer text. */
  citations: ProviderCitation[];
  /** URLs the model typed into its answer text. Informational only; never citations or evidence. */
  mentionedUrls?: ModelMentionedUrl[];
  raw: unknown;
  collectedAt: string;
  latencyMs: number;
  usage?: ProviderUsage;
  billedCostUsd?: number;
  requestId?: string;
  finishReason?: string;
};

export type ProviderRunOptions = {
  signal?: AbortSignal;
  maxOutputTokens: number;
  budget?: ProviderSpendBudget;
};

export interface AnswerProviderAdapter {
  id: ProviderId;
  configured(): boolean;
  run(prompt: ProviderPrompt, options: ProviderRunOptions): Promise<ProviderAnswer>;
}

export class ProviderRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(provider: string, status: number, detail?: string) {
    const safeDetail = detail ? redactOperationalText(detail, 300) : "";
    super(`${provider} request failed (${status})${safeDetail ? `: ${safeDetail}` : "."}`);
    this.name = "ProviderRequestError";
    this.status = status;
    this.code = status === 429 ? "rate_limited" : status >= 500 || status === 408 ? "provider_unavailable" : "provider_rejected";
    this.retryable = status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
  }
}

export function requestIdFrom(response: Response, bodyId?: string) {
  return response.headers.get("x-request-id")
    || response.headers.get("request-id")
    || bodyId
    || undefined;
}

/**
 * URLs the model wrote in its answer text. The result is deliberately typed as
 * `ModelMentionedUrl` rather than `ProviderCitation`: callers must store it as
 * `mentionedUrls` (labelled model-written), never as citations or evidence, and
 * never as a fallback when the provider returned no structured citations.
 */
export function extractModelMentionedUrls(text: string): ModelMentionedUrl[] {
  return Array.from(new Set((text.match(/https?:\/\/[^\s)\]}>,"']+/gi) || []).map((url) => url.replace(/[.;:]+$/, "")))).map((url) => ({ url }));
}
