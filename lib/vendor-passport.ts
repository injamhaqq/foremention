/**
 * Vendor Passport — a machine-readable, evidence-bound description of the
 * customer's company that an AI buyer agent can read and verify.
 *
 * This is the "30-year idea, built sensibly now": rather than trying to
 * influence a provider, the customer publishes a structured, dated, citable
 * record of what is true about them, on their own domain.
 *
 * Hard rules, enforced here and covered by tests:
 * - Only claims the customer explicitly approved for public use are included.
 * - Only verified, unexpired claims carrying evidence are included.
 * - Missing organization context is reported as unverified, never guessed.
 * - Outcome language (rankings, traffic, leads, revenue) is refused outright.
 * - The output is deterministic, so two runs of the same facts are identical.
 */

export type PassportOrganization = {
  name: string;
  website: string | null;
  category: string | null;
};

export type PassportClaim = {
  id: string;
  approvedWording: string;
  limitations: string | null;
  publicUse: boolean;
  claimVerificationStatus: "pending" | "verified" | "disputed" | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  evidenceUrl: string | null;
  evidenceTitle: string | null;
  evidenceUsageRights: string | null;
  evidenceVerificationStatus: string | null;
};

export type PassportExclusion = {
  id: string;
  wording: string;
  reason:
    | "not_approved_for_public_use"
    | "not_verified"
    | "expired"
    | "missing_evidence"
    | "unsupported_outcome_claim";
};

export type VendorPassport = {
  document: Record<string, unknown>;
  included: number;
  excluded: PassportExclusion[];
  unverifiedFields: string[];
  generatedAt: string | null;
};

/**
 * Wording that asserts an outcome Foremention cannot observe or control. A
 * passport is a factual record, so these are refused even when a reviewer
 * approved them.
 */
const OUTCOME_CLAIM = /\b(rank(?:s|ed|ing)?\s+(?:#?1|first|top|number\s*one)|guarantee(?:d|s)?|will\s+recommend|(?:chatgpt|claude|gemini|perplexity|copilot|ai\s+(?:assistant|agent|answer|engine))\s+(?:will\s+)?recommend(?:s|ed|ing)?|more\s+traffic|(?:increase|boost|grow|double|drive)[sd]?\s+(?:traffic|leads|revenue|sales)|best\s+in\s+the\s+world)\b/i;

const collapse = (value: string | null | undefined, limit: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

const normalizeDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const normalizeHttpUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

export function classifyPassportClaim(claim: PassportClaim, now: number): PassportExclusion["reason"] | null {
  if (!claim.publicUse) return "not_approved_for_public_use";
  const verifiedAt = normalizeDate(claim.verifiedAt);
  const expiresAt = normalizeDate(claim.expiresAt);
  if (claim.claimVerificationStatus !== "verified" || !verifiedAt || (claim.expiresAt && !expiresAt) || claim.evidenceVerificationStatus !== "verified" || !collapse(claim.approvedWording, 1000)) return "not_verified";
  if (expiresAt && Date.parse(expiresAt) <= now) return "expired";
  if (!normalizeHttpUrl(claim.evidenceUrl) || !collapse(claim.evidenceUsageRights, 200)) return "missing_evidence";
  if (OUTCOME_CLAIM.test(collapse(claim.approvedWording, 1000))) return "unsupported_outcome_claim";
  return null;
}

export function buildVendorPassport(input: {
  organization: PassportOrganization;
  claims: PassportClaim[];
  generatedAt: string;
}): VendorPassport {
  const generatedAt = normalizeDate(input.generatedAt);
  if (!generatedAt) throw new Error("Vendor Passport requires a valid generation timestamp.");
  const now = Date.parse(generatedAt);
  const excluded: PassportExclusion[] = [];
  const accepted: PassportClaim[] = [];

  for (const claim of [...input.claims].sort((a, b) => a.id.localeCompare(b.id))) {
    const reason = classifyPassportClaim(claim, now);
    if (reason) excluded.push({ id: claim.id, wording: collapse(claim.approvedWording, 1000), reason });
    else accepted.push(claim);
  }

  const name = collapse(input.organization.name, 200);
  const website = normalizeHttpUrl(input.organization.website) || null;
  const category = collapse(input.organization.category, 200);

  const unverifiedFields: string[] = [];
  if (!name) unverifiedFields.push("name");
  if (!website) unverifiedFields.push("url");
  if (!category) unverifiedFields.push("category");
  if (!accepted.length) unverifiedFields.push("verifiedStatements");
  const publisherSuppliedFields = [name ? "name" : null, website ? "url" : null, category ? "description" : null]
    .filter((field): field is string => Boolean(field));

  const document: Record<string, unknown> = {
    "@context": ["https://schema.org", { foremention: "https://foremention.com/ns#" }],
    "@type": "Organization",
    ...(name ? { name } : {}),
    ...(website ? { url: website } : {}),
    ...(category ? { description: category } : {}),
    subjectOf: accepted.map((claim) => ({
      "@type": "Claim",
      text: collapse(claim.approvedWording, 1000),
      ...(claim.limitations ? { disambiguatingDescription: collapse(claim.limitations, 500) } : {}),
      dateCreated: normalizeDate(claim.verifiedAt),
      ...(normalizeDate(claim.expiresAt) ? { expires: normalizeDate(claim.expiresAt) } : {}),
      citation: {
        "@type": "CreativeWork",
        ...(claim.evidenceTitle ? { name: collapse(claim.evidenceTitle, 300) } : {}),
        url: normalizeHttpUrl(claim.evidenceUrl),
        usageInfo: collapse(claim.evidenceUsageRights, 200),
      },
    })),
    // Provenance is part of the record: an agent reading this can see who
    // assembled it, from what, and what it deliberately does not assert.
    "foremention:provenance": {
      generator: "Foremention Vendor Passport",
      schemaVersion: "1.0",
      generatedAt,
      publisherSuppliedFields,
      verifiedStatementCount: accepted.length,
      excludedStatementCount: excluded.length,
      unverifiedFields,
      boundary: "Identity and category fields are publisher-supplied workspace context. Every subjectOf statement was approved by this company for public use and is linked to dated evidence with recorded usage rights. Foremention does not assert rankings, citations, traffic, leads, or revenue, and does not claim any AI provider will recommend this company.",
    },
  };

  return {
    document,
    included: accepted.length,
    excluded,
    unverifiedFields,
    generatedAt,
  };
}

/**
 * Stable, human-inspectable serialization that is also safe to paste inside an
 * HTML JSON-LD script element. Escaping `<` prevents customer-authored text
 * such as `</script>` from ending the element and becoming executable markup.
 */
export function serializeVendorPassport(passport: VendorPassport) {
  return `${JSON.stringify(passport.document, null, 2)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")}\n`;
}
