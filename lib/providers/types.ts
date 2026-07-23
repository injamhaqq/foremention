export type ProviderId = "openai" | "gemini" | "anthropic" | "perplexity" | "mock";

export type ProviderPrompt = {
  promptId: string;
  text: string;
  locale?: string;
};

export type ProviderCitation = {
  url: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
};

export type ProviderAnswer = {
  provider: ProviderId;
  model: string;
  promptId: string;
  answer: string;
  citations: ProviderCitation[];
  raw: unknown;
  collectedAt: string;
  latencyMs: number;
};

export interface AnswerProviderAdapter {
  id: ProviderId;
  configured(): boolean;
  run(prompt: ProviderPrompt): Promise<ProviderAnswer>;
}

export function extractUrls(text: string) {
  return Array.from(new Set(text.match(/https?:\/\/[^\s)\]}>,"']+/gi) || [])).map((url) => ({ url: url.replace(/[.;:]+$/, "") }));
}
