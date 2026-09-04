import { env } from "cloudflare:workers";
import type { AcquisitionResearchFact } from "@/lib/acquisition-research";
import {
  buildScrapeGraphResearchRequest,
  extractScrapeGraphResearchFacts,
} from "@/lib/acquisition-research-scrapegraph-contract";

const SEARCH_ENDPOINT = "https://v2-api.scrapegraphai.com/api/search";
const SEARCH_CREDITS_PER_RESULT_WITH_PROMPT = 5;
const MAX_RESEARCH_RESULTS = 3;

export type AcquisitionResearchProviderResult = {
  facts: AcquisitionResearchFact[];
  creditsUsed: number;
};

export type AcquisitionResearchProvider = {
  id: string;
  research(input: {
    companyName: string;
    domain: string | null;
    maxResults: number;
    maxCredits: number;
  }): Promise<AcquisitionResearchProviderResult>;
};

function apiKey() {
  const value = (env as unknown as Record<string, unknown>).SGAI_API_KEY;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boundedInteger(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

export function scrapeGraphAcquisitionResearchProvider(): AcquisitionResearchProvider | null {
  const key = apiKey();
  if (!key) return null;

  return {
    id: "scrapegraphai-v2-search-research",
    async research({ companyName, domain, maxResults, maxCredits }) {
      const affordableResults = Math.floor(maxCredits / SEARCH_CREDITS_PER_RESULT_WITH_PROMPT);
      const numResults = Math.min(MAX_RESEARCH_RESULTS, boundedInteger(maxResults, MAX_RESEARCH_RESULTS, MAX_RESEARCH_RESULTS), affordableResults);
      if (numResults < 2) throw new Error("ACQUISITION_RESEARCH_BUDGET_EXHAUSTED_BEFORE_PROVIDER_CALL");

      const request = buildScrapeGraphResearchRequest({ companyName, domain, maxResults: numResults });
      const response = await fetch(SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "SGAI-APIKEY": key,
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`ACQUISITION_RESEARCH_PROVIDER_HTTP_${response.status}`);

      const payload = (await response.json()) as unknown;
      const retrievedAt = new Date().toISOString();
      return {
        facts: extractScrapeGraphResearchFacts(payload, retrievedAt),
        creditsUsed: numResults * SEARCH_CREDITS_PER_RESULT_WITH_PROMPT,
      };
    },
  };
}
