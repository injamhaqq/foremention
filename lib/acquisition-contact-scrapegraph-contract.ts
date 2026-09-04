import { normalizeAcquisitionContactCandidates } from "./acquisition-contact-resolution.ts";

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

export function buildScrapeGraphContactRequest(input: {
  companyName: string;
  domain: string;
  maxResults: number;
}) {
  const companyName = input.companyName.trim().slice(0, 200);
  const domain = input.domain.trim().toLowerCase().slice(0, 253);
  const numResults = boundedInteger(input.maxResults, 3, 3);
  return {
    query: `${companyName} ${domain} VP Marketing CMO Head of Marketing Head of Growth Head of SEO Director SEO public business email team`,
    numResults,
    prompt: [
      "Return only public business contact routes directly supported by the returned search results.",
      `The email must be a company-domain business address for ${domain}; never return personal/free-mail addresses.`,
      "Prioritize CMO, VP Marketing, VP Growth, Head of Marketing, Head of Growth, Head/Director SEO, Organic, Content, Demand Generation, AI Search, or GEO roles.",
      "Every contact must include fullName, jobTitle, email, sourceUrl copied from one of the returned search result URLs, and confidence from 0 to 100.",
      "Do not infer or generate email patterns. If an email is not explicitly public in the source evidence, omit the contact.",
    ].join(" "),
    schema: {
      type: "object",
      properties: {
        contacts: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              jobTitle: { type: "string" },
              email: { type: "string" },
              sourceUrl: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["fullName", "jobTitle", "email", "sourceUrl", "confidence"],
          },
        },
      },
      required: ["contacts"],
    },
  } as const;
}

export function extractScrapeGraphContactCandidates(payload: unknown, companyDomain: string, retrievedAt: string) {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const results = Array.isArray(data?.results) ? data.results : [];
  const allowedSources = new Set(
    results
      .map((result) => normalizeHttpsUrl(asRecord(result)?.url))
      .filter((url): url is string => Boolean(url)),
  );
  if (allowedSources.size === 0) throw new Error("ACQUISITION_CONTACT_PROVIDER_MALFORMED_RESPONSE");
  const json = asRecord(data?.json) ?? asRecord(data?.json_data);
  const contacts = Array.isArray(json?.contacts) ? json.contacts : [];
  if (contacts.length === 0) return [];

  const sourceBound = contacts.map((raw) => {
    const record = asRecord(raw);
    const sourceUrl = normalizeHttpsUrl(record?.sourceUrl);
    if (!sourceUrl || !allowedSources.has(sourceUrl)) {
      throw new Error("ACQUISITION_CONTACT_PROVIDER_SOURCE_MISMATCH");
    }
    return {
      fullName: record?.fullName,
      jobTitle: record?.jobTitle,
      email: record?.email,
      sourceUrl,
      retrievedAt,
      confidence: record?.confidence,
    };
  });

  return normalizeAcquisitionContactCandidates(sourceBound, companyDomain);
}
