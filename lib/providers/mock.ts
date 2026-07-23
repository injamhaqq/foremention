import type { AnswerProviderAdapter, ProviderAnswer, ProviderPrompt } from "@/lib/providers/types";

export const mockAdapter: AnswerProviderAdapter = {
  id: "mock", configured: () => true,
  async run(prompt: ProviderPrompt): Promise<ProviderAnswer> {
    return { provider: "mock", model: "seeded-demo-1", promptId: prompt.promptId, answer: "A seeded development answer. Configure a provider key to collect live evidence.", citations: [{ url: "https://remoteworklab.com/guides/hr-platforms", title: "Seeded demo source" }], raw: { demo: true }, collectedAt: new Date().toISOString(), latencyMs: 12 };
  },
};
