import type { ProviderId, ProviderUsage } from "@/lib/providers/types";
import { redactOperationalText } from "./operational-error.js";

export const LIVE_COLLECTION_LIMITS = {
  maxPromptsPerRun: 10,
  maxProvidersPerRun: 1,
  maxOutputTokensPerAnswer: 1200,
  maxInputTokensPerPromptEstimate: 512,
  providerTimeoutMs: 45_000,
  providerRetries: 2,
  circuitFailureThreshold: 3,
  circuitWindowMinutes: 15,
  maxRunCostUsd: 0.25,
} as const;

export const GROQ_SPEND_LIMITS = {
  // Keep the conservative browser-search reservation independent from the
  // whole-run ceiling. Defaults intentionally preserve today's $0.10 Groq
  // run cap; separating the dimensions prevents a future run-cap increase
  // from also inflating every prompt's reservation estimate.
  reservedCostPerPromptUsd: 0.10,
  maxRunCostUsd: 0.10,
  maxMonthlyOrgSpendUsd: 5.00,
} as const;

type CostRates = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  requestUsd: number;
};

const providerPrefix: Record<Exclude<ProviderId, "mock">, string> = {
  openai: "OPENAI",
  gemini: "GEMINI",
  anthropic: "ANTHROPIC",
  perplexity: "PERPLEXITY",
  groq: "GROQ",
  cloudflare: "CLOUDFLARE",
  openrouter: "OPENROUTER",
  zenmux: "ZENMUX",
  omnirouters: "OMNIROUTERS",
};

function finiteNonNegative(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getProviderCostRates(provider: Exclude<ProviderId, "mock">): CostRates | null {
  const prefix = providerPrefix[provider];
  const inputPerMillionUsd = finiteNonNegative(process.env[`${prefix}_INPUT_COST_PER_MILLION_USD`]);
  const outputPerMillionUsd = finiteNonNegative(process.env[`${prefix}_OUTPUT_COST_PER_MILLION_USD`]);
  const requestUsd = finiteNonNegative(process.env[`${prefix}_REQUEST_COST_USD`]);
  if (inputPerMillionUsd === null || outputPerMillionUsd === null || requestUsd === null) return null;
  return { inputPerMillionUsd, outputPerMillionUsd, requestUsd };
}

export function estimateProviderCost(usage: ProviderUsage | undefined, rates: CostRates | null) {
  if (!usage || !rates || usage.inputTokens === undefined || usage.outputTokens === undefined) return null;
  return roundUsd(
    rates.requestUsd
      + (usage.inputTokens / 1_000_000) * rates.inputPerMillionUsd
      + (usage.outputTokens / 1_000_000) * rates.outputPerMillionUsd,
  );
}

export function estimateMaximumRunCost(
  promptCount: number,
  rates: CostRates,
  limits = LIVE_COLLECTION_LIMITS,
) {
  const safePromptCount = Math.max(0, Math.min(limits.maxPromptsPerRun, Math.trunc(promptCount)));
  return roundUsd(safePromptCount * (
    rates.requestUsd
      + (limits.maxInputTokensPerPromptEstimate / 1_000_000) * rates.inputPerMillionUsd
      + (limits.maxOutputTokensPerAnswer / 1_000_000) * rates.outputPerMillionUsd
  ));
}

export function estimateReservedRunCost(
  provider: Exclude<ProviderId, "mock">,
  promptCount: number,
  rates: CostRates,
  limits = LIVE_COLLECTION_LIMITS,
) {
  const safePromptCount = Math.max(0, Math.min(limits.maxPromptsPerRun, Math.trunc(promptCount)));
  if (provider === "groq") {
    return roundUsd(safePromptCount * GROQ_SPEND_LIMITS.reservedCostPerPromptUsd);
  }
  return estimateMaximumRunCost(safePromptCount, rates, limits);
}

export function configuredMaxRunCostUsd() {
  return finiteNonNegative(process.env.FOREMENTION_MAX_RUN_COST_USD) ?? LIVE_COLLECTION_LIMITS.maxRunCostUsd;
}

export function hasOpenProviderCircuit(
  failures: Array<{ run_id: string }>,
  threshold = LIVE_COLLECTION_LIMITS.circuitFailureThreshold,
) {
  return new Set(failures.map((failure) => failure.run_id).filter(Boolean)).size >= threshold;
}

export function roundUsd(value: number) {
  return Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;
}

export function canonicalizeEvidenceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid|ref|referrer|source)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

export function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function safeOperationalError(error: unknown) {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "Unknown collection failure.";
  return redactOperationalText(message);
}
