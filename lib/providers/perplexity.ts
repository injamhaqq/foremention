import { extractUrls, type AnswerProviderAdapter, type ProviderAnswer, type ProviderPrompt } from "@/lib/providers/types";

export const perplexityAdapter: AnswerProviderAdapter = {
  id: "perplexity",
  configured: () => Boolean(process.env.PERPLEXITY_API_KEY),
  async run(prompt: ProviderPrompt): Promise<ProviderAnswer> {
    const started = Date.now();
    const response = await fetch("https://api.perplexity.ai/v1/sonar", { method: "POST", headers: { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.PERPLEXITY_MODEL || "sonar", messages: [{ role: "user", content: prompt.text }] }) });
    const raw = (await response.json()) as { model?: string; citations?: string[]; choices?: Array<{ message?: { content?: string } }> };
    if (!response.ok) throw new Error(`Perplexity adapter failed (${response.status}).`);
    const answer = raw.choices?.[0]?.message?.content || "";
    const citations = (raw.citations || []).map((url) => ({ url }));
    return { provider: "perplexity", model: raw.model || process.env.PERPLEXITY_MODEL || "configured model", promptId: prompt.promptId, answer, citations: citations.length ? citations : extractUrls(answer), raw, collectedAt: new Date().toISOString(), latencyMs: Date.now() - started };
  },
};
