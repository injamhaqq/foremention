import { ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";

type GroqSearchResult = {
  title?: string;
  url?: string;
};

type GroqResponse = {
  id?: string;
  model?: string;
  error?: { message?: string; type?: string; code?: string };
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      executed_tools?: Array<{
        type?: string;
        search_results?: { results?: GroqSearchResult[] } | GroqSearchResult[];
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  x_groq?: { id?: string };
};

function searchCitations(raw: GroqResponse): ProviderCitation[] {
  const citations: ProviderCitation[] = [];
  for (const tool of raw.choices?.[0]?.message?.executed_tools || []) {
    const searchResults = Array.isArray(tool.search_results)
      ? tool.search_results
      : tool.search_results?.results || [];
    for (const result of searchResults) {
      if (result.url) citations.push({ url: result.url, title: result.title });
    }
  }
  return Array.from(new Map(citations.map((citation) => [citation.url, citation])).values());
}

export const groqAdapter: AnswerProviderAdapter = {
  id: "groq",
  configured: () => Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL),
  async run(prompt: ProviderPrompt, options) {
    const started = Date.now();
    const model = String(process.env.GROQ_MODEL);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: options.signal,
      headers: {
        authorization: `Bearer ${String(process.env.GROQ_API_KEY)}`,
        "content-type": "application/json",
        "Groq-Model-Version": process.env.GROQ_MODEL_VERSION || "2025-07-23",
      },
      body: JSON.stringify({
        model,
        citation_options: "enabled",
        compound_custom: { tools: { enabled_tools: ["web_search"] } },
        messages: [
          {
            role: "system",
            content: "Use web search for this buyer question. Give a direct, evidence-based answer and cite the sources returned by the search tool. Do not invent companies, claims, or URLs.",
          },
          { role: "user", content: prompt.text },
        ],
        max_completion_tokens: options.maxOutputTokens,
      }),
    });
    const responseText = await response.text();
    let raw: GroqResponse = {};
    try {
      raw = responseText ? JSON.parse(responseText) as GroqResponse : {};
    } catch {
      if (response.ok) throw new Error("Groq returned an unreadable success response.");
    }
    if (!response.ok) {
      const detail = [raw.error?.type ? `[${raw.error.type}]` : "", raw.error?.message || ""].filter(Boolean).join(" ");
      throw new ProviderRequestError("Groq", response.status, detail);
    }
    const choice = raw.choices?.[0];
    const answer = choice?.message?.content || "";
    const citations = searchCitations(raw);
    const usage = raw.usage ? {
      inputTokens: raw.usage.prompt_tokens,
      outputTokens: raw.usage.completion_tokens,
      totalTokens: raw.usage.total_tokens,
    } : undefined;
    return {
      provider: "groq",
      model: raw.model || model,
      promptId: prompt.promptId,
      answer,
      citations,
      raw: {
        model: raw.model || model,
        finishReason: choice?.finish_reason,
        usage,
        citationCount: citations.length,
        searchUsed: citations.length > 0,
      },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response, raw.x_groq?.id || raw.id),
      finishReason: choice?.finish_reason,
    };
  },
};
