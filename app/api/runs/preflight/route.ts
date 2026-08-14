import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  configuredMaxRunCostUsd,
  estimateMaximumRunCost,
  getProviderCostRates,
  GROQ_SPEND_LIMITS,
  LIVE_COLLECTION_LIMITS,
} from "@/lib/collection-policy";
import { getProviderStatuses } from "@/lib/data";
import { currentObservationMethodologyVersion } from "@/lib/methodology-registry";
import type { ProviderId } from "@/lib/providers/types";

const liveProviders = new Set<Exclude<ProviderId, "mock">>([
  "openai",
  "gemini",
  "anthropic",
  "perplexity",
  "groq",
  "cloudflare",
  "openrouter",
  "zenmux",
  "omnirouters",
]);

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Live collection preflight is unavailable in the fictional demo." }, { status: 400 });

  const url = new URL(request.url);
  const provider = (url.searchParams.get("provider") || "") as Exclude<ProviderId, "mock">;
  const promptCount = Number(url.searchParams.get("promptCount") || "1");
  if (!liveProviders.has(provider)) return NextResponse.json({ error: "Choose a supported live provider." }, { status: 400 });
  if (!Number.isInteger(promptCount) || promptCount < 1 || promptCount > LIVE_COLLECTION_LIMITS.maxPromptsPerRun) {
    return NextResponse.json({ error: `Choose between 1 and ${LIVE_COLLECTION_LIMITS.maxPromptsPerRun} buyer questions.` }, { status: 400 });
  }

  const configured = getProviderStatuses().some((item) => item.id === provider && item.configured);
  const rates = getProviderCostRates(provider);
  if (!configured || !rates) {
    return NextResponse.json({
      provider,
      promptCount,
      configured: false,
      error: "This provider is not fully configured with a secure connection, explicit model, and current cost rates.",
    }, { status: 503 });
  }

  const estimatedMaximumCostUsd = estimateMaximumRunCost(promptCount, rates);
  const configuredCeilingUsd = configuredMaxRunCostUsd();
  const providerCeilingUsd = provider === "groq" ? GROQ_SPEND_LIMITS.maxRunCostUsd : configuredCeilingUsd;

  return NextResponse.json({
    provider,
    promptCount,
    configured: true,
    methodologyVersion: currentObservationMethodologyVersion(),
    estimatedMaximumCostUsd,
    configuredRunCostCeilingUsd: Math.min(configuredCeilingUsd, providerCeilingUsd),
    maxOutputTokensPerAnswer: LIVE_COLLECTION_LIMITS.maxOutputTokensPerAnswer,
    providerTimeoutMs: LIVE_COLLECTION_LIMITS.providerTimeoutMs,
    providerRetries: LIVE_COLLECTION_LIMITS.providerRetries,
  }, {
    headers: { "cache-control": "private, no-store" },
  });
}
