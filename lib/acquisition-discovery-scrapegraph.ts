import { env } from "cloudflare:workers";
import type { AcquisitionDiscoveryProvider, AcquisitionDiscoveryProviderResult } from "@/lib/acquisition-discovery";

const SEARCH_ENDPOINT = "https://v2-api.scrapegraphai.com/api/search";
const SEARCH_CREDITS_PER_RESULT_WITH_PROMPT = 5;

type SearchCompany = { name?: unknown; domain?: unknown; sourceUrl?: unknown; url?: unknown };

function apiKey() {
  const value = (env as unknown as Record<string, unknown>).SGAI_API_KEY;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractedCompanies(payload: unknown): SearchCompany[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const json = asRecord(data?.json) ?? asRecord(data?.json_data);
  const companies = json?.companies;
  if (Array.isArray(companies)) return companies.filter((item): item is SearchCompany => Boolean(asRecord(item)));
  return [];
}

export function scrapeGraphAcquisitionProvider(): AcquisitionDiscoveryProvider | null {
  const key = apiKey();
  if (!key) return null;

  return {
    id: "scrapegraphai-v2-search",
    async discover({ query, maxCandidates, maxCredits }): Promise<AcquisitionDiscoveryProviderResult> {
      const affordableResults = Math.floor(maxCredits / SEARCH_CREDITS_PER_RESULT_WITH_PROMPT);
      const numResults = Math.min(maxCandidates, affordableResults);
      if (numResults < 1) throw new Error("ACQUISITION_DISCOVERY_BUDGET_EXHAUSTED_BEFORE_PROVIDER_CALL");

      const response = await fetch(SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "SGAI-APIKEY": key,
        },
        body: JSON.stringify({
          query,
          numResults,
          prompt:
            "Return only real B2B SaaS companies supported by the search results. For each company return name, official domain, and the public source URL supporting discovery. Do not return people, email addresses, inferred private contact data, or fabricated companies.",
          schema: {
            type: "object",
            properties: {
              companies: {
                type: "array",
                maxItems: numResults,
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    domain: { type: "string" },
                    sourceUrl: { type: "string" },
                  },
                  required: ["name", "domain", "sourceUrl"],
                },
              },
            },
            required: ["companies"],
          },
        }),
      });

      if (!response.ok) throw new Error(`ACQUISITION_DISCOVERY_PROVIDER_HTTP_${response.status}`);
      const payload = (await response.json()) as unknown;
      const companies = extractedCompanies(payload);
      if (!companies.length) throw new Error("ACQUISITION_DISCOVERY_PROVIDER_MALFORMED_RESPONSE");

      const retrievedAt = new Date().toISOString();
      const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
      return {
        creditsUsed: numResults * SEARCH_CREDITS_PER_RESULT_WITH_PROMPT,
        candidates: companies.slice(0, numResults).map((company) => ({
          companyName: typeof company.name === "string" ? company.name : "",
          domain: typeof company.domain === "string" ? company.domain : null,
          sourceUrl:
            typeof company.sourceUrl === "string"
              ? company.sourceUrl
              : typeof company.url === "string"
                ? company.url
                : "",
          retrievedAt,
          providerRequestId: requestId,
        })),
      };
    },
  };
}
