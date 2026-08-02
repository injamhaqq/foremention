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
  citations: ProviderCitation[];
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

export function extractUrls(text: string) {
  return Array.from(new Set(text.match(/https?:\/\/[^\s)\]}>,"']+/gi) || [])).map((url) => ({ url: url.replace(/[.;:]+$/, "") }));
}
