import { anthropicAdapter } from "@/lib/providers/anthropic";
import { geminiAdapter } from "@/lib/providers/gemini";
import { groqAdapter } from "@/lib/providers/groq";
import { mockAdapter } from "@/lib/providers/mock";
import { openAIAdapter } from "@/lib/providers/openai";
import { perplexityAdapter } from "@/lib/providers/perplexity";
import type { AnswerProviderAdapter, ProviderId } from "@/lib/providers/types";

const providers: Record<ProviderId, AnswerProviderAdapter> = { openai: openAIAdapter, gemini: geminiAdapter, anthropic: anthropicAdapter, perplexity: perplexityAdapter, groq: groqAdapter, mock: mockAdapter };
export function getProvider(id: ProviderId) { const provider = providers[id]; if (!provider) throw new Error(`Unknown provider: ${id}`); if (!provider.configured()) throw new Error(`${id} is not configured.`); return provider; }
export const providerIds = Object.keys(providers) as ProviderId[];
