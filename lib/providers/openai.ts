import { extractUrls, ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderAnswer, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";

type OpenAIResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string; start_index?: number; end_index?: number }> }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  status?: string;
};

export const openAIAdapter: AnswerProviderAdapter = {
  id: "openai",
  configured: () => Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = String(process.env.OPENAI_MODEL);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: options.signal,
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: prompt.text,
        max_output_tokens: options.maxOutputTokens,
        store: false,
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "low" },
        tools: [{ type: "web_search" }],
      }),
    });
    const raw = (await response.json()) as OpenAIResponse;
    if (!response.ok) throw new ProviderRequestError("OpenAI", response.status);
    const content = (raw.output || []).flatMap((item) => item.content || []);
    const answer = raw.output_text || content.map((item) => item.text || "").join("\n");
    const annotated: ProviderCitation[] = content.flatMap((item) => item.annotations || []).filter((item) => item.type === "url_citation" && item.url).map((item) => ({ url: item.url as string, title: item.title, startIndex: item.start_index, endIndex: item.end_index }));
    const citations = annotated.length ? annotated : extractUrls(answer);
    const usage = raw.usage ? { inputTokens: raw.usage.input_tokens, outputTokens: raw.usage.output_tokens, totalTokens: raw.usage.total_tokens } : undefined;
    return {
      provider: "openai",
      model: raw.model || model,
      promptId: prompt.promptId,
      answer,
      citations,
      raw: { id: raw.id, model: raw.model || model, status: raw.status, usage, citationCount: citations.length },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response, raw.id),
      finishReason: raw.status,
    };
  },
};
