export type AcquisitionBuyerRole = "economic_buyer" | "champion";

export type AcquisitionContactCandidate = {
  fullName: string;
  jobTitle: string;
  email: string;
  sourceUrl: string;
  retrievedAt: string;
  confidence: number;
  buyerRole: AcquisitionBuyerRole;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeDomain(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().toLowerCase();
  const candidate = raw.includes("://") ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
    return hostname.includes(".") ? hostname : null;
  } catch {
    return null;
  }
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

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) return null;
  return new Date(timestamp).toISOString();
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

function roleFromTitle(title: string): AcquisitionBuyerRole | null {
  const normalized = title.toLowerCase();
  if (/\b(cmo|chief marketing officer|vp marketing|vice president.{0,20}marketing|vp growth|vice president.{0,20}growth|head of marketing|head of growth)\b/.test(normalized)) {
    return "economic_buyer";
  }
  if (/\b(head|director|lead|manager).{0,30}\b(seo|organic|content|growth marketing|demand generation|demand gen|ai search|geo)\b/.test(normalized)) {
    return "champion";
  }
  if (/\b(seo|organic growth|content marketing|growth marketing|demand generation|ai search|geo)\b/.test(normalized)) {
    return "champion";
  }
  return null;
}

function normalizeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, max);
  return normalized || null;
}

export function normalizeAcquisitionContactCandidates(input: readonly unknown[], companyDomain: string) {
  const domain = normalizeDomain(companyDomain);
  if (!domain) throw new Error("ACQUISITION_CONTACT_COMPANY_DOMAIN_REQUIRED");
  const deduped = new Map<string, AcquisitionContactCandidate>();

  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("ACQUISITION_CONTACT_MALFORMED_CANDIDATE");
    const record = raw as Record<string, unknown>;
    const fullName = normalizeText(record.fullName, 160);
    const jobTitle = normalizeText(record.jobTitle, 160);
    const email = normalizeText(record.email, 320)?.toLowerCase() ?? null;
    const sourceUrl = normalizeHttpsUrl(record.sourceUrl);
    const retrievedAt = normalizeTimestamp(record.retrievedAt);
    const confidence = normalizeConfidence(record.confidence);
    if (!fullName || !jobTitle || !email || !EMAIL_PATTERN.test(email) || !sourceUrl || !retrievedAt || confidence === null) {
      throw new Error("ACQUISITION_CONTACT_MALFORMED_CANDIDATE");
    }
    const emailDomain = email.split("@")[1]?.replace(/^www\./, "") ?? "";
    if (emailDomain !== domain && !emailDomain.endsWith(`.${domain}`)) {
      throw new Error("ACQUISITION_CONTACT_ROUTE_DOMAIN_MISMATCH");
    }
    const buyerRole = roleFromTitle(jobTitle);
    if (!buyerRole) throw new Error("ACQUISITION_CONTACT_ROLE_OUTSIDE_INITIAL_HYPOTHESIS");

    const candidate: AcquisitionContactCandidate = {
      fullName,
      jobTitle,
      email,
      sourceUrl,
      retrievedAt,
      confidence,
      buyerRole,
    };
    const existing = deduped.get(email);
    if (!existing || candidate.confidence > existing.confidence) deduped.set(email, candidate);
  }

  return [...deduped.values()].sort((left, right) => {
    const roleDifference = Number(right.buyerRole === "economic_buyer") - Number(left.buyerRole === "economic_buyer");
    return roleDifference || right.confidence - left.confidence || left.email.localeCompare(right.email);
  });
}

export function selectBestAcquisitionContact(candidates: readonly AcquisitionContactCandidate[]) {
  return [...candidates].sort((left, right) => {
    const roleDifference = Number(right.buyerRole === "economic_buyer") - Number(left.buyerRole === "economic_buyer");
    return roleDifference || right.confidence - left.confidence || left.email.localeCompare(right.email);
  })[0] ?? null;
}
