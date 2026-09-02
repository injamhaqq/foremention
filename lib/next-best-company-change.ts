export const NEXT_BEST_PRIORITY_BANDS = ["NOW", "NEXT", "WATCH", "BLOCKED", "INSUFFICIENT_EVIDENCE"] as const;
export type NextBestPriorityBand = typeof NEXT_BEST_PRIORITY_BANDS[number];

export type NextBestCandidate = {
  changeSpecificationId: string;
  title: string;
  status: "draft" | "in_review" | "approved" | "in_execution" | "completed" | "rejected";
  decisionState: "DO_NOW" | "TEST_FIRST" | "DO_NOT_DO" | "MONITOR_ONLY" | "INSUFFICIENT_EVIDENCE";
  controlClass: "CONTROLLABLE" | "INFLUENCEABLE" | "UNCONTROLLABLE" | null;
  eligibilityState: "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "STRUCTURALLY_INELIGIBLE" | "UNKNOWN";
  confidenceState: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  effort: "LOW" | "MEDIUM" | "HIGH" | null;
  humanPriorityRank: number | null;
  verifiedEvidenceCount: number;
  verifiedCrossBusinessEvidenceCount: number;
  crossBusinessDirections: Array<"supports" | "contradicts" | "context" | "unknown">;
  unresolvedDependencies: number;
  createdAt: string;
};

export type NextBestChangeEvaluation = {
  changeSpecificationId: string;
  priorityBand: NextBestPriorityBand;
  ordinalRank: number;
  reasonCodes: string[];
  factorSnapshot: {
    humanDecision: NextBestCandidate["decisionState"];
    controlClass: NextBestCandidate["controlClass"];
    eligibilityState: NextBestCandidate["eligibilityState"];
    confidenceState: NextBestCandidate["confidenceState"];
    effort: NextBestCandidate["effort"];
    humanPriorityRank: number | null;
    verifiedEvidenceCount: number;
    verifiedCrossBusinessEvidenceCount: number;
    crossBusinessDirections: NextBestCandidate["crossBusinessDirections"];
    unresolvedDependencies: number;
    status: NextBestCandidate["status"];
  };
};

type ClassifiedCandidate = Omit<NextBestChangeEvaluation, "ordinalRank"> & {
  candidate: NextBestCandidate;
};

const bandOrder: Record<NextBestPriorityBand, number> = {
  NOW: 0,
  NEXT: 1,
  WATCH: 2,
  INSUFFICIENT_EVIDENCE: 3,
  BLOCKED: 4,
};

const effortOrder: Record<NonNullable<NextBestCandidate["effort"]>, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function snapshot(candidate: NextBestCandidate): NextBestChangeEvaluation["factorSnapshot"] {
  return {
    humanDecision: candidate.decisionState,
    controlClass: candidate.controlClass,
    eligibilityState: candidate.eligibilityState,
    confidenceState: candidate.confidenceState,
    effort: candidate.effort,
    humanPriorityRank: candidate.humanPriorityRank,
    verifiedEvidenceCount: candidate.verifiedEvidenceCount,
    verifiedCrossBusinessEvidenceCount: candidate.verifiedCrossBusinessEvidenceCount,
    crossBusinessDirections: [...candidate.crossBusinessDirections],
    unresolvedDependencies: candidate.unresolvedDependencies,
    status: candidate.status,
  };
}

function classify(candidate: NextBestCandidate): ClassifiedCandidate {
  const reasonCodes: string[] = [];
  let priorityBand: NextBestPriorityBand;

  if (candidate.status === "rejected" || candidate.status === "completed") {
    priorityBand = "BLOCKED";
    reasonCodes.push("terminal_change_state");
  } else if (candidate.decisionState === "DO_NOT_DO") {
    priorityBand = "BLOCKED";
    reasonCodes.push("human_do_not_do");
  } else if (candidate.eligibilityState === "STRUCTURALLY_INELIGIBLE") {
    priorityBand = "BLOCKED";
    reasonCodes.push("structurally_ineligible");
  } else if (candidate.controlClass === "UNCONTROLLABLE") {
    priorityBand = candidate.decisionState === "MONITOR_ONLY" ? "WATCH" : "BLOCKED";
    reasonCodes.push("uncontrollable_factor");
  } else if (candidate.decisionState === "MONITOR_ONLY") {
    priorityBand = "WATCH";
    reasonCodes.push("human_monitor_only");
  } else if (candidate.unresolvedDependencies > 0) {
    priorityBand = "NEXT";
    reasonCodes.push("unresolved_dependencies");
  } else if (candidate.decisionState === "TEST_FIRST") {
    priorityBand = "NEXT";
    reasonCodes.push("human_test_first");
    if (candidate.eligibilityState === "UNKNOWN") reasonCodes.push("eligibility_unknown");
    if (candidate.confidenceState === "INSUFFICIENT") reasonCodes.push("confidence_insufficient");
  } else if (
    candidate.eligibilityState === "UNKNOWN"
    || candidate.confidenceState === "INSUFFICIENT"
    || candidate.verifiedEvidenceCount < 1
  ) {
    priorityBand = "INSUFFICIENT_EVIDENCE";
    if (candidate.eligibilityState === "UNKNOWN") reasonCodes.push("eligibility_unknown");
    if (candidate.confidenceState === "INSUFFICIENT") reasonCodes.push("confidence_insufficient");
    if (candidate.verifiedEvidenceCount < 1) reasonCodes.push("verified_evidence_missing");
  } else if (
    candidate.decisionState === "DO_NOW"
    && (candidate.controlClass === "CONTROLLABLE" || candidate.controlClass === "INFLUENCEABLE")
    && (candidate.eligibilityState === "ELIGIBLE" || candidate.eligibilityState === "PARTIALLY_ELIGIBLE")
  ) {
    priorityBand = "NOW";
    reasonCodes.push("human_do_now", "execution_path_available");
    if (candidate.verifiedCrossBusinessEvidenceCount > 0) reasonCodes.push("verified_cross_business_context");
    if (candidate.crossBusinessDirections.includes("contradicts")) reasonCodes.push("cross_business_contradiction_requires_review");
  } else {
    priorityBand = "NEXT";
    reasonCodes.push("review_before_execution");
  }

  return {
    candidate,
    changeSpecificationId: candidate.changeSpecificationId,
    priorityBand,
    reasonCodes,
    factorSnapshot: snapshot(candidate),
  };
}

function stableNumber(value: number | null) {
  return value && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function compareClassified(a: ClassifiedCandidate, b: ClassifiedCandidate) {
  const byBand = bandOrder[a.priorityBand] - bandOrder[b.priorityBand];
  if (byBand) return byBand;

  const byHumanRank = stableNumber(a.candidate.humanPriorityRank) - stableNumber(b.candidate.humanPriorityRank);
  if (byHumanRank) return byHumanRank;

  const aEffort = a.candidate.effort ? effortOrder[a.candidate.effort] : 3;
  const bEffort = b.candidate.effort ? effortOrder[b.candidate.effort] : 3;
  if (aEffort !== bEffort) return aEffort - bEffort;

  const byCreated = a.candidate.createdAt.localeCompare(b.candidate.createdAt);
  if (byCreated) return byCreated;
  return a.candidate.changeSpecificationId.localeCompare(b.candidate.changeSpecificationId);
}

/**
 * Explainable ordering only. This function never authorizes a company change
 * and never mutates the human decision or approval state.
 */
export function evaluateNextBestCompanyChanges(candidates: NextBestCandidate[]): NextBestChangeEvaluation[] {
  return candidates
    .map(classify)
    .sort(compareClassified)
    .map(({ candidate: _candidate, ...evaluation }, index) => ({
      ...evaluation,
      ordinalRank: index + 1,
    }));
}
