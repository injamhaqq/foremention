export const COMPANY_TRUTH_ENTITY_TYPES = [
  "company",
  "product",
  "package",
  "integration",
  "market",
  "policy",
  "proof",
] as const;

export const COMPANY_TRUTH_VERIFICATION_STATES = [
  "unverified",
  "verified",
  "rejected",
  "superseded",
  "expired",
] as const;

export type CompanyTruthEntityType = (typeof COMPANY_TRUTH_ENTITY_TYPES)[number];
export type CompanyTruthVerificationState = (typeof COMPANY_TRUTH_VERIFICATION_STATES)[number];

export type CompanyTruthAssertion = {
  id: string;
  organizationId: string;
  projectId: string;
  entityId: string;
  entityType: CompanyTruthEntityType;
  attributeKey: string;
  assertedValue: unknown;
  evidenceItemId: string | null;
  sourceSnapshot: Record<string, unknown>;
  verificationState: CompanyTruthVerificationState;
  effectiveAt: string;
  supersededAt: string | null;
  verifiedAt: string | null;
};

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isCurrentVerifiedTruth(assertion: CompanyTruthAssertion, now = new Date()) {
  if (assertion.verificationState !== "verified" || assertion.supersededAt) return false;
  const effectiveAt = validDate(assertion.effectiveAt);
  if (effectiveAt === null || effectiveAt > now.getTime()) return false;
  return true;
}

export function selectCurrentVerifiedTruth(assertions: CompanyTruthAssertion[], now = new Date()) {
  const current = assertions
    .filter((assertion) => isCurrentVerifiedTruth(assertion, now))
    .sort((left, right) => {
      const leftTime = validDate(left.verifiedAt) ?? validDate(left.effectiveAt) ?? 0;
      const rightTime = validDate(right.verifiedAt) ?? validDate(right.effectiveAt) ?? 0;
      return rightTime - leftTime;
    });

  const seen = new Set<string>();
  return current.filter((assertion) => {
    const key = `${assertion.entityId}:${assertion.attributeKey.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
