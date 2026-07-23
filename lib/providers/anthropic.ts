import { extractUrls, type AnswerProviderAdapter, type ProviderAnswer, type ProviderPrompt } from "@/lib/providers/types";

export const anthropicAdapter: AnswerProviderAdapter = {
  id: "anthropic",
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL),
  async run(prompt: ProviderPrompt): Promise<ProviderAnswer> {
    const started = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": String(process.env.ANTHROPIC_API_KEY), "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL, max_tokens: 1500, tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 3, allowed_callers: ["direct"] }], messages: [{ role: "user", content: `${prompt.text}\n\nUse web-accessible evidence when available and include source URLs.` }] }) });
    const raw = (await response.json()) as { model?: string; content?: Array<{ type: string; text?: string; citations?: Array<{ type?: string; url?: string; title?: string }> }> };
    if (!response.ok) throw new Error(`Anthropic adapter failed (${response.status}).`);
    const answer = (raw.content || []).map((item) => item.text || "").join("\n");
    const suppliedCitations = (raw.content || []).flatMap((item) => item.citations || []).filter((citation) => Boolean(citation.url)).map((citation) => ({ url: citation.url!, title: citation.title }));
    return { provider: "anthropic", model: raw.model || process.env.ANTHROPIC_MODEL || "configured model", promptId: prompt.promptId, answer, citations: suppliedCitations.length ? suppliedCitations : extractUrls(answer), raw, collectedAt: new Date().toISOString(), latencyMs: Date.now() - started };
  },
};
