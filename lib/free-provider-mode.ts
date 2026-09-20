import type { ProviderId } from "@/lib/providers/types";

type LiveProviderId = Exclude<ProviderId, "mock">;

export const FREE_ONLY_COLLECTION_PROVIDER: LiveProviderId = "gemini";
export const FREE_ONLY_INTERNAL_MODEL_PROVIDERS = new Set<LiveProviderId>(["gemini", "cloudflare"]);

export function freeOnlyProviderMode() {
  return process.env.FOREMENTION_FREE_ONLY_MODE === "1";
}

export function providerAllowedForLiveCollection(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || provider === FREE_ONLY_COLLECTION_PROVIDER;
}

export function providerAllowedForInternalModelWork(provider: LiveProviderId) {
  return !freeOnlyProviderMode() || FREE_ONLY_INTERNAL_MODEL_PROVIDERS.has(provider);
}
