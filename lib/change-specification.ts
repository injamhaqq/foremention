export const CONTROL_CLASSES = ["CONTROLLABLE", "INFLUENCEABLE", "UNCONTROLLABLE"] as const;
export const ELIGIBILITY_STATES = ["ELIGIBLE", "PARTIALLY_ELIGIBLE", "STRUCTURALLY_INELIGIBLE", "UNKNOWN"] as const;
export const DECISION_STATES = ["DO_NOW", "TEST_FIRST", "DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"] as const;
export const TRUTH_STATES = ["OBSERVED_FACT", "LIKELY_EXPLANATION", "HYPOTHESIS", "RECOMMENDED_EXPERIMENT", "VERIFIED_OUTCOME"] as const;
export const CONFIDENCE_STATES = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] as const;
export const VERIFICATION_STATES = ["IMPROVED", "UNCHANGED", "WORSENED", "INSUFFICIENT_EVIDENCE"] as const;
export const EFFORT_STATES = ["LOW", "MEDIUM", "HIGH"] as const;
export const CHANGE_SPECIFICATION_STATUSES = ["draft", "in_review", "approved", "in_execution", "completed", "rejected"] as const;

export type ControlClass = typeof CONTROL_CLASSES[number];
export type EligibilityState = typeof ELIGIBILITY_STATES[number];
export type DecisionState = typeof DECISION_STATES[number];
export type TruthState = typeof TRUTH_STATES[number];
export type ConfidenceState = typeof CONFIDENCE_STATES[number];
export type VerificationState = typeof VERIFICATION_STATES[number];
export type EffortState = typeof EFFORT_STATES[number];
export type ChangeSpecificationStatus = typeof CHANGE_SPECIFICATION_STATUSES[number];

export type ChangeSpecification = {
  id: string | null;
  opportunityId: string;
  baselineRunId: string | null;
  controlClass: ControlClass | null;
  controlSurface: string | null;
  eligibilityState: EligibilityState;
  decisionState: DecisionState;
  truthState: TruthState;
  confidenceState: ConfidenceState;
  title: string;
  problemStatement: string;
  exactChange: string | null;
  scope: Record<string, unknown>;
  ownerRole: string | null;
  ownerId: string | null;
  priorityRank: number | null;
  effort: EffortState | null;
  dependencies: string[];
  commercialRelevance: Record<string, unknown>;
  recommendationRelevance: Record<string, unknown>;
  acceptanceCriteria: string[];
  verificationPlan: Record<string, unknown>;
};

export type ChangeSpecificationReviewValidation = {
  ok: boolean;
  missing: string[];
  invalid: string[];
};

export function isCanonicalValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function buildSafeChangeSpecificationDraft(input: {
  opportunityId: string;
  baselineRunId: string | null;
  title: string;
  problemStatement: string;
}): ChangeSpecification {
  return {
    id: null,
    opportunityId: input.opportunityId,
    baselineRunId: input.baselineRunId,
    controlClass: null,
    controlSurface: null,
    eligibilityState: "UNKNOWN",
    decisionState: "INSUFFICIENT_EVIDENCE",
    truthState: "HYPOTHESIS",
    confidenceState: "INSUFFICIENT",
    title: input.title.trim(),
    problemStatement: input.problemStatement.trim(),
    exactChange: null,
    scope: {},
    ownerRole: null,
    ownerId: null,
    priorityRank: null,
    effort: null,
    dependencies: [],
    commercialRelevance: {},
    recommendationRelevance: {},
    acceptanceCriteria: [],
    verificationPlan: {},
  };
}

const hasText = (value: string | null | undefined) => Boolean(value?.trim());
const hasVerificationIntent = (value: Record<string, unknown>) => {
  const intent = value.intent;
  return typeof intent === "string" && intent.trim().length > 0;
};

/**
 * Human-review completeness boundary. This deliberately validates only whether
 * a material company decision is explicit enough to submit; it does not infer
 * that the decision is correct, valuable, causal, or high-confidence.
 */
export function validateChangeSpecificationForReview(
  input: ChangeSpecification & { linkedEvidenceCount: number },
): ChangeSpecificationReviewValidation {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (!Number.isFinite(input.linkedEvidenceCount) || input.linkedEvidenceCount < 1) missing.push("evidence");
  if (!input.controlClass) missing.push("controlClass");
  if (input.controlClass === "CONTROLLABLE" && !hasText(input.controlSurface)) missing.push("controlSurface");
  if (!hasText(input.exactChange)) missing.push("exactChange");
  if (!hasText(input.ownerRole)) missing.push("ownerRole");
  if (!input.effort) missing.push("effort");
  if (!Array.isArray(input.acceptanceCriteria) || input.acceptanceCriteria.filter((criterion) => criterion.trim()).length === 0) {
    missing.push("acceptanceCriteria");
  }
  if (!input.verificationPlan || Object.keys(input.verificationPlan).length === 0 || !hasVerificationIntent(input.verificationPlan)) {
    missing.push("verificationPlan");
  }

  if (input.controlClass === "UNCONTROLLABLE" && input.decisionState === "DO_NOW") {
    invalid.push("uncontrollableDoNow");
  }

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}
