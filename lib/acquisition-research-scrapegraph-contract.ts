import {
  ACQUISITION_RESEARCH_FACT_KEYS,
  normalizeAcquisitionResearchFacts,
} from "./acquisition-research.ts";

const MAX_RESEARCH_RESULTS = 3;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function boundedInteger(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

export function buildScrapeGraphResearchRequest(input: {
  companyName: string;
  domain: string | null;
  maxResults: number;
}) {
  const companyName = input.companyName.trim().slice(0, 200);
  const domain = input.domain?.trim().slice(0, 253) || "";
  const numResults = boundedInteger(input.maxResults, MAX_RESEARCH_RESULTS, MAX_RESEARCH_RESULTS);
  const factKeys = ACQUISITION_RESEARCH_FACT_KEYS.join(", ");

  return {
    query: [companyName, domain, "B2B SaaS marketing SEO GEO AI search competitors launch funding hiring positioning buyer questions"].filter(Boolean).join(" "),
    numResults,
    prompt: [
      "Return only factual company research directly supported by the returned public search results.",
      `Every fact key must be one of: ${factKeys}.`,
      "Every fact must include sourceUrl copied from one of the returned search result URLs, a concise factual value, and confidence from 0 to 100.",
      "Do not invent people, email addresses, private contact information, funding, employee counts, launches, buyer questions, competitors, or triggers.",
      "Use employee_band only with values 50-500, under-50, over-500, or unknown when directly supported.",
      "Use disqualifier only for an explicit public fact that materially conflicts with the initial ICP or safe outreach eligibility.",
    ].join(" "),
    schema: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: [...ACQUISITION_RESEARCH_FACT_KEYS] },
              value: { type: "string" },
              sourceUrl: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["key", "value", "sourceUrl", "confidence"],
          },
        },
      },
      required: ["facts"],
    },
  } as const;
}

export function extractScrapeGraphResearchFacts(payload: unknown, retrievedAt: string) {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const results = Array.isArray(data?.results) ? data.results : [];
  const allowedSourceUrls = new Set(
    results
      .map((result) => normalizeHttpsUrl(asRecord(result)?.url))
      .filter((url): url is string => Boolean(url)),
  );
  if (allowedSourceUrls.size === 0) throw new Error("ACQUISITION_RESEARCH_PROVIDER_MALFORMED_RESPONSE");

  const json = asRecord(data?.json) ?? asRecord(data?.json_data);
  const rawFacts = Array.isArray(json?.facts) ? json.facts : [];
  if (rawFacts.length === 0) throw new Error("ACQUISITION_RESEARCH_PROVIDER_MALFORMED_RESPONSE");

  const sourceBound = rawFacts.map((rawFact) => {
    const fact = asRecord(rawFact);
    const sourceUrl = normalizeHttpsUrl(fact?.sourceUrl);
    if (!sourceUrl || !allowedSourceUrls.has(sourceUrl)) {
      throw new Error("ACQUISITION_RESEARCH_PROVIDER_SOURCE_MISMATCH");
    }
    return {
      key: fact?.key,
      value: fact?.value,
      sourceUrl,
      retrievedAt,
      confidence: fact?.confidence,
    };
  });

  return normalizeAcquisitionResearchFacts(sourceBound);
}
