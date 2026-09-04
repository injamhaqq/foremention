import { env } from "cloudflare:workers";
import {
  buildScrapeGraphContactRequest,
  extractScrapeGraphContactCandidates,
} from "@/lib/acquisition-contact-scrapegraph-contract";
import type { AcquisitionContactCandidate } from "@/lib/acquisition-contact-resolution";

const SEARCH_ENDPOINT = "https://v2-api.scrapegraphai.com/api/search";
const SEARCH_CREDITS_PER_RESULT_WITH_PROMPT = 5;
const MAX_CONTACT_RESULTS = 3;

export type AcquisitionContactProvider = {
  id: string;
  resolve(input: {
    companyName: string;
    domain: string;
    maxResults: number;
    maxCredits: number;
  }): Promise<{ contacts: AcquisitionContactCandidate[]; creditsUsed: number }>;
};

function apiKey() {
  const value = (env as unknown as Record<string, unknown>).SGAI_API_KEY;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boundedInteger(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

export function scrapeGraphAcquisitionContactProvider(): AcquisitionContactProvider | null {
  const key = apiKey();
  if (!key) return null;

  return {
    id: "scrapegraphai-v2-public-contact-search",
    async resolve({ companyName, domain, maxResults, maxCredits }) {
      const affordableResults = Math.floor(maxCredits / SEARCH_CREDITS_PER_RESULT_WITH_PROMPT);
      const numResults = Math.min(MAX_CONTACT_RESULTS, boundedInteger(maxResults, MAX_CONTACT_RESULTS, MAX_CONTACT_RESULTS), affordableResults);
      if (numResults < 1) throw new Error("ACQUISITION_CONTACT_BUDGET_EXHAUSTED_BEFORE_PROVIDER_CALL");
      const request = buildScrapeGraphContactRequest({ companyName, domain, maxResults: numResults });
      const response = await fetch(SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "SGAI-APIKEY": key,
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`ACQUISITION_CONTACT_PROVIDER_HTTP_${response.status}`);
      const payload = (await response.json()) as unknown;
      return {
        contacts: extractScrapeGraphContactCandidates(payload, domain, new Date().toISOString()),
        creditsUsed: numResults * SEARCH_CREDITS_PER_RESULT_WITH_PROMPT,
      };
    },
  };
}
