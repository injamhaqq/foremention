import { anthropicAdapter } from "@/lib/providers/anthropic";
import { cloudflareAdapter } from "@/lib/providers/cloudflare";
import { geminiAdapter } from "@/lib/providers/gemini";
import { groqAdapter } from "@/lib/providers/groq";
import { mockAdapter } from "@/lib/providers/mock";
import { openAIAdapter } from "@/lib/providers/openai";
import { openRouterAdapter } from "@/lib/providers/openrouter";
import { omniRoutersAdapter } from "@/lib/providers/omnirouters";
import { zenMuxAdapter } from "@/lib/providers/zenmux";
import { perplexityAdapter } from "@/lib/providers/perplexity";
import type { AnswerProviderAdapter, ProviderId } from "@/lib/providers/types";

const providers: Record<ProviderId, AnswerProviderAdapter> = { openai: openAIAdapter, gemini: geminiAdapter, anthropic: anthropicAdapter, perplexity: perplexityAdapter, groq: groqAdapter, cloudflare: cloudflareAdapter, openrouter: openRouterAdapter, zenmux: zenMuxAdapter, omnirouters: omniRoutersAdapter, mock: mockAdapter };
export function getProvider(id: ProviderId) { const provider = providers[id]; if (!provider) throw new Error(`Unknown provider: ${id}`); if (!provider.configured()) throw new Error(`${id} is not configured.`); return provider; }
export const providerIds = Object.keys(providers) as ProviderId[];
