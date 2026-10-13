import type { ProviderId } from "@/lib/providers/types";

type LiveProviderId = Exclude<ProviderId, "mock">;

export const FREE_ONLY_COLLECTION_PROVIDER: LiveProviderId = "cloudflare";
export const FREE_ONLY_INTERNAL_MODEL_PROVIDERS = new Set<LiveProviderId>(["cloudflare"]);

export function freeOnlyProviderMode() {
  return process.env.FOREMENTION_FREE_ONLY_MODE !== "0";
}

/**
 * Measurement must observe one exact, pinned model. There is deliberately no
 * default: when GEMINI_MODEL is unset or blank, Gemini is unavailable (fail
 * closed), exactly like every other provider, instead of silently measuring a
 * different model.
 */
export function configuredGeminiModel(): string | null {
  return process.env.GEMINI_MODEL?.trim() || null;
}

export function providerAllowedForLiveCollection(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || provider === FREE_ONLY_COLLECTION_PROVIDER;
}

export function providerAllowedForInternalModelWork(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || FREE_ONLY_INTERNAL_MODEL_PROVIDERS.has(provider);
}
