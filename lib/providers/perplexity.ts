import { ProviderRequestError, type AnswerProviderAdapter, type ProviderAnswer, type ProviderPrompt } from "@/lib/providers/types";

/**
 * CV-03: Perplexity announced retirement of the Sonar API on 2026-09-27.
 * The previous /v1/sonar adapter no longer has a supported contract.
 * Do NOT substitute a new model/endpoint without new model+method provenance,
 * current vendor docs, response/citation/usage fixtures and budget approval.
 */
export const perplexityAdapter: AnswerProviderAdapter = {
  id: "perplexity",
  configured: () => false,
  async run(_prompt: ProviderPrompt): Promise<ProviderAnswer> {
    throw new ProviderRequestError("Perplexity Sonar", 410, "Retired legacy Sonar API. The current Agent API adapter has not been validated or authorized.");
  },
};
