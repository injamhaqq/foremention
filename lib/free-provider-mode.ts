import type { ProviderId } from "@/lib/providers/types";

type LiveProviderId = Exclude<ProviderId, "mock">;

export const FREE_ONLY_COLLECTION_PROVIDER: LiveProviderId = "cloudflare";
export const OPTIONAL_GEMINI_MODEL_FALLBACK = "gemini-3.5-flash-lite";
export const FREE_ONLY_INTERNAL_MODEL_PROVIDERS = new Set<LiveProviderId>(["cloudflare"]);

export function freeOnlyProviderMode() {
  return process.env.FOREMENTION_FREE_ONLY_MODE !== "0";
}

export function configuredGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || OPTIONAL_GEMINI_MODEL_FALLBACK;
}

export function providerAllowedForLiveCollection(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || provider === FREE_ONLY_COLLECTION_PROVIDER;
}

export function providerAllowedForInternalModelWork(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || FREE_ONLY_INTERNAL_MODEL_PROVIDERS.has(provider);
}
