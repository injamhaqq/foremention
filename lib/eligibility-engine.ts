import type { CompanyTruthAssertion, CompanyTruthEntityType } from "@/lib/company-truth";

export const ELIGIBILITY_OPERATORS = ["EXISTS", "EQUALS", "INCLUDES", "NOT_EQUALS"] as const;
export const ELIGIBILITY_IMPORTANCE = ["REQUIRED", "SUPPORTING"] as const;
export const ELIGIBILITY_MATCH_STATES = ["MATCH", "MISMATCH", "UNKNOWN"] as const;
export const ELIGIBILITY_STATES = ["ELIGIBLE", "PARTIALLY_ELIGIBLE", "STRUCTURALLY_INELIGIBLE", "UNKNOWN"] as const;

export type EligibilityOperator = (typeof ELIGIBILITY_OPERATORS)[number];
export type EligibilityImportance = (typeof ELIGIBILITY_IMPORTANCE)[number];
export type EligibilityMatchState = (typeof ELIGIBILITY_MATCH_STATES)[number];
export type EligibilityState = (typeof ELIGIBILITY_STATES)[number];

export type EligibilityRequirement = {
  id: string;
  entityType: CompanyTruthEntityType;
  attributeKey: string;
  operator: EligibilityOperator;
  expectedValue: unknown;
  importance: EligibilityImportance;
  reviewStatus: "draft" | "verified" | "rejected";
};

export type EligibilityRequirementResult = {
  requirementId: string;
  importance: EligibilityImportance;
  state: EligibilityMatchState;
  reasonCode: string;
  matchedAssertionIds: string[];
};

export type EligibilityEvaluation = {
  state: EligibilityState;
  reasonCodes: string[];
  results: EligibilityRequirementResult[];
  requirementCount: number;
  truthAssertionCount: number;
  engineVersion: "decision-intelligence-v1";
};

function normalizeString(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function normalize(value: unknown): unknown {
  if (typeof value === "string") return normalizeString(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

function equivalent(left: unknown, right: unknown) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function present(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function includesValue(actual: unknown, expected: unknown) {
  if (typeof actual === "string" && typeof expected === "string") {
    return normalizeString(actual).includes(normalizeString(expected));
  }
  if (Array.isArray(actual)) {
    const expectedItems = Array.isArray(expected) ? expected : [expected];
    return expectedItems.every((wanted) => actual.some((item) => equivalent(item, wanted)));
  }
  if (actual && typeof actual === "object" && expected && typeof expected === "object") {
    const source = actual as Record<string, unknown>;
    return Object.entries(expected as Record<string, unknown>).every(([key, wanted]) => key in source && equivalent(source[key], wanted));
  }
  return false;
}

function evaluateRequirement(requirement: EligibilityRequirement, assertions: CompanyTruthAssertion[]): EligibilityRequirementResult {
  const candidates = assertions.filter((assertion) =>
    assertion.verificationState === "verified"
    && !assertion.supersededAt
    && assertion.entityType === requirement.entityType
    && assertion.attributeKey.trim().toLowerCase() === requirement.attributeKey.trim().toLowerCase(),
  );

  if (requirement.operator === "EXISTS") {
    const matches = candidates.filter((assertion) => present(assertion.assertedValue));
    return matches.length
      ? { requirementId: requirement.id, importance: requirement.importance, state: "MATCH", reasonCode: "VERIFIED_TRUTH_EXISTS", matchedAssertionIds: matches.map((item) => item.id) }
      : { requirementId: requirement.id, importance: requirement.importance, state: "UNKNOWN", reasonCode: "VERIFIED_TRUTH_MISSING", matchedAssertionIds: [] };
  }

  if (!candidates.length) {
    return { requirementId: requirement.id, importance: requirement.importance, state: "UNKNOWN", reasonCode: "VERIFIED_TRUTH_MISSING", matchedAssertionIds: [] };
  }

  if (requirement.operator === "EQUALS") {
    const matches = candidates.filter((assertion) => equivalent(assertion.assertedValue, requirement.expectedValue));
    return matches.length
      ? { requirementId: requirement.id, importance: requirement.importance, state: "MATCH", reasonCode: "VERIFIED_TRUTH_EQUALS_REQUIREMENT", matchedAssertionIds: matches.map((item) => item.id) }
      : { requirementId: requirement.id, importance: requirement.importance, state: "MISMATCH", reasonCode: "VERIFIED_TRUTH_DIFFERS_FROM_REQUIREMENT", matchedAssertionIds: candidates.map((item) => item.id) };
  }

  if (requirement.operator === "INCLUDES") {
    const matches = candidates.filter((assertion) => includesValue(assertion.assertedValue, requirement.expectedValue));
    return matches.length
      ? { requirementId: requirement.id, importance: requirement.importance, state: "MATCH", reasonCode: "VERIFIED_TRUTH_INCLUDES_REQUIREMENT", matchedAssertionIds: matches.map((item) => item.id) }
      : { requirementId: requirement.id, importance: requirement.importance, state: "MISMATCH", reasonCode: "VERIFIED_TRUTH_DOES_NOT_INCLUDE_REQUIREMENT", matchedAssertionIds: candidates.map((item) => item.id) };
  }

  const equalMatches = candidates.filter((assertion) => equivalent(assertion.assertedValue, requirement.expectedValue));
  return equalMatches.length
    ? { requirementId: requirement.id, importance: requirement.importance, state: "MISMATCH", reasonCode: "VERIFIED_TRUTH_EQUALS_EXCLUDED_VALUE", matchedAssertionIds: equalMatches.map((item) => item.id) }
    : { requirementId: requirement.id, importance: requirement.importance, state: "MATCH", reasonCode: "VERIFIED_TRUTH_DIFFERS_FROM_EXCLUDED_VALUE", matchedAssertionIds: candidates.map((item) => item.id) };
}

export function evaluateEligibility(requirements: EligibilityRequirement[], assertions: CompanyTruthAssertion[]): EligibilityEvaluation {
  const verifiedRequirements = requirements.filter((requirement) => requirement.reviewStatus === "verified");
  const currentAssertions = assertions.filter((assertion) => assertion.verificationState === "verified" && !assertion.supersededAt);
  const results = verifiedRequirements.map((requirement) => evaluateRequirement(requirement, currentAssertions));

  const requiredMismatch = results.some((result) => result.importance === "REQUIRED" && result.state === "MISMATCH");
  const requiredUnknown = results.some((result) => result.importance === "REQUIRED" && result.state === "UNKNOWN");
  const supportingGap = results.some((result) => result.importance === "SUPPORTING" && result.state !== "MATCH");

  let state: EligibilityState;
  const reasonCodes: string[] = [];
  if (requiredMismatch) {
    state = "STRUCTURALLY_INELIGIBLE";
    reasonCodes.push("REQUIRED_REQUIREMENT_MISMATCH");
  } else if (!verifiedRequirements.length) {
    state = "UNKNOWN";
    reasonCodes.push("NO_VERIFIED_REQUIREMENTS");
  } else if (requiredUnknown) {
    state = "UNKNOWN";
    reasonCodes.push("REQUIRED_REQUIREMENT_UNKNOWN");
  } else if (supportingGap) {
    state = "PARTIALLY_ELIGIBLE";
    reasonCodes.push("SUPPORTING_REQUIREMENT_GAP");
  } else {
    state = "ELIGIBLE";
    reasonCodes.push("ALL_VERIFIED_REQUIREMENTS_MATCH");
  }

  return {
    state,
    reasonCodes,
    results,
    requirementCount: verifiedRequirements.length,
    truthAssertionCount: currentAssertions.length,
    engineVersion: "decision-intelligence-v1",
  };
}
