export const ACQUISITION_DISCOVERY_MAX_CANDIDATES = 25 as const;
export const ACQUISITION_DISCOVERY_MAX_CREDITS = 100 as const;

export type AcquisitionDiscoveryCandidate = {
  companyName: string;
  domain?: string | null;
  sourceUrl: string;
  retrievedAt: string;
  providerRequestId?: string | null;
};

export type AcquisitionDiscoveryProviderResult = {
  candidates: readonly AcquisitionDiscoveryCandidate[];
  creditsUsed: number;
};

export type AcquisitionDiscoveryProvider = {
  id: string;
  discover(input: {
    query: string;
    maxCandidates: number;
    maxCredits: number;
  }): Promise<AcquisitionDiscoveryProviderResult>;
};

export type AcquisitionDiscoveryRunInput = {
  query: string;
  maxCandidates?: number;
  maxCredits?: number;
};

export type NormalizedAcquisitionCandidate = {
  companyName: string;
  domain: string | null;
  canonicalCompanyKey: string;
  sourceUrl: string;
  retrievedAt: string;
  providerId: string;
  providerRequestId: string | null;
};

export type AcquisitionDiscoveryRunResult = {
  providerId: string;
  query: string;
  creditsUsed: number;
  candidates: NormalizedAcquisitionCandidate[];
};

function boundedInteger(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(value)));
}

function normalizeCompanyName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 200);
  return normalized || null;
}

export function normalizeAcquisitionDomain(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().toLowerCase();
  const candidate = raw.includes("://") ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
    if (!hostname || hostname.length > 253 || !hostname.includes(".")) return null;
    return hostname;
  } catch {
    return null;
  }
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function companyNameKey(name: string) {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function canonicalAcquisitionCompanyKey(companyName: string, domain?: string | null) {
  const normalizedDomain = normalizeAcquisitionDomain(domain);
  if (normalizedDomain) return `domain:${normalizedDomain}`;
  const normalizedName = normalizeCompanyName(companyName);
  if (!normalizedName) return null;
  const key = companyNameKey(normalizedName);
  return key ? `name:${key}` : null;
}

export async function runAcquisitionDiscovery(
  provider: AcquisitionDiscoveryProvider | null,
  input: AcquisitionDiscoveryRunInput,
): Promise<AcquisitionDiscoveryRunResult> {
  if (!provider || !provider.id.trim()) throw new Error("ACQUISITION_DISCOVERY_PROVIDER_UNAVAILABLE");

  const query = typeof input.query === "string" ? input.query.trim().slice(0, 500) : "";
  if (!query) throw new Error("ACQUISITION_DISCOVERY_QUERY_REQUIRED");

  const maxCandidates = boundedInteger(input.maxCandidates, 10, ACQUISITION_DISCOVERY_MAX_CANDIDATES);
  const maxCredits = boundedInteger(input.maxCredits, 20, ACQUISITION_DISCOVERY_MAX_CREDITS);

  const result = await provider.discover({ query, maxCandidates, maxCredits });
  const creditsUsed = Number.isFinite(result.creditsUsed) ? Math.max(0, Math.trunc(result.creditsUsed)) : Number.NaN;
  if (!Number.isFinite(creditsUsed) || creditsUsed > maxCredits) {
    throw new Error("ACQUISITION_DISCOVERY_BUDGET_EXCEEDED");
  }

  const deduped = new Map<string, NormalizedAcquisitionCandidate>();
  for (const candidate of result.candidates.slice(0, maxCandidates)) {
    const companyName = normalizeCompanyName(candidate.companyName);
    const sourceUrl = normalizeHttpUrl(candidate.sourceUrl);
    const retrievedAt = normalizeTimestamp(candidate.retrievedAt);
    const domain = normalizeAcquisitionDomain(candidate.domain);
    const canonicalCompanyKey = companyName ? canonicalAcquisitionCompanyKey(companyName, domain) : null;

    if (!companyName || !sourceUrl || !retrievedAt || !canonicalCompanyKey) {
      throw new Error("ACQUISITION_DISCOVERY_MALFORMED_CANDIDATE");
    }

    if (!deduped.has(canonicalCompanyKey)) {
      deduped.set(canonicalCompanyKey, {
        companyName,
        domain,
        canonicalCompanyKey,
        sourceUrl,
        retrievedAt,
        providerId: provider.id.trim().slice(0, 80),
        providerRequestId:
          typeof candidate.providerRequestId === "string" && candidate.providerRequestId.trim()
            ? candidate.providerRequestId.trim().slice(0, 200)
            : null,
      });
    }
  }

  return {
    providerId: provider.id.trim().slice(0, 80),
    query,
    creditsUsed,
    candidates: [...deduped.values()],
  };
}
