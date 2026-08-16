import { ProviderRequestError, requestIdFrom, type AnswerProviderAdapter, type ProviderCitation, type ProviderPrompt } from "@/lib/providers/types";
import { estimateMaximumRunCost, getProviderCostRates, GROQ_SPEND_LIMITS, roundUsd } from "@/lib/collection-policy";

const GROQ_BASIC_SEARCH_REQUEST_COST_USD = 0.005;

type GroqSearchResult = {
  title?: string;
  url?: string;
};

type GroqExecutedTool = {
  type?: string;
  search_results?: { results?: GroqSearchResult[] } | GroqSearchResult[];
};

type GroqResponse = {
  id?: string;
  model?: string;
  error?: { message?: string; type?: string; code?: string };
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      executed_tools?: GroqExecutedTool[];
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  x_groq?: { id?: string };
};

function toolSearchResults(tool: GroqExecutedTool): GroqSearchResult[] {
  return Array.isArray(tool.search_results)
    ? tool.search_results
    : tool.search_results?.results || [];
}

function searchCitations(raw: GroqResponse): ProviderCitation[] {
  const citations: ProviderCitation[] = [];
  for (const tool of raw.choices?.[0]?.message?.executed_tools || []) {
    for (const result of toolSearchResults(tool)) {
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
    const rates = getProviderCostRates("groq");
    if (!rates) throw new ProviderRequestError("Groq", 503, "Groq cost rates are not configured.");
    if (rates.requestUsd < GROQ_BASIC_SEARCH_REQUEST_COST_USD) {
      throw new ProviderRequestError("Groq", 503, `Groq fixed request cost must reserve at least $${GROQ_BASIC_SEARCH_REQUEST_COST_USD.toFixed(3)} for mandatory basic web search.`);
    }
    const estimatedPromptCost = estimateMaximumRunCost(1, rates);
    if (options.budget) {
      const nextRunSpend = roundUsd(options.budget.runSpendSoFarUsd + estimatedPromptCost);
      const nextMonthlySpend = roundUsd(options.budget.monthlySpendSoFarUsd + estimatedPromptCost);
      if (nextRunSpend > options.budget.runLimitUsd || nextRunSpend > GROQ_SPEND_LIMITS.maxRunCostUsd) {
        throw new ProviderRequestError("Groq", 429, `Groq spending limit reached for this run. The maximum allowed spend is $${Math.min(options.budget.runLimitUsd, GROQ_SPEND_LIMITS.maxRunCostUsd).toFixed(2)} per run.`);
      }
      if (nextMonthlySpend > options.budget.monthlyLimitUsd || nextMonthlySpend > GROQ_SPEND_LIMITS.maxMonthlyOrgSpendUsd) {
        throw new ProviderRequestError("Groq", 429, `Groq spending limit reached for this organization this month. The maximum allowed spend is $${Math.min(options.budget.monthlyLimitUsd, GROQ_SPEND_LIMITS.maxMonthlyOrgSpendUsd).toFixed(2)} per month.`);
      }
    }
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
        compound_custom: { tools: { enabled_tools: ["web_search"] } },
        tool_choice: "required",
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
      // Provider messages are intentionally excluded: a provider can echo
      // customer prompt content in an error response. Status/type/code are
      // sufficient for operations without persisting customer text in logs.
      const detail = [raw.error?.type, raw.error?.code].filter(Boolean).join(": ");
      throw new ProviderRequestError("Groq", response.status, detail);
    }
    const choice = raw.choices?.[0];
    const answer = choice?.message?.content || "";
    const executedTools = choice?.message?.executed_tools || [];
    const webSearchTools = executedTools.filter((tool) => tool.type === "search");
    const searchResultCount = webSearchTools.reduce((total, tool) => total + toolSearchResults(tool).length, 0);
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
        searchObservationVersion: 1,
        searchUsed: webSearchTools.length > 0,
        searchResultCount,
      },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      requestId: requestIdFrom(response, raw.x_groq?.id || raw.id),
      finishReason: choice?.finish_reason,
    };
  },
};
