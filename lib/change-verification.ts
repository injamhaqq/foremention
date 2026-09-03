export const CHANGE_VERIFICATION_STATES = ["IMPROVED", "UNCHANGED", "WORSENED", "INSUFFICIENT_EVIDENCE"] as const;
export type ChangeVerificationState = typeof CHANGE_VERIFICATION_STATES[number];

type DeltaMetric = {
  before?: number | null;
  after?: number | null;
  delta?: number | null;
};

export type FollowUpOutcome = {
  baselineRunId?: string;
  followUpRunId?: string;
  brandPresencePct?: DeltaMetric;
  firstMentionPct?: DeltaMetric;
  citationCount?: DeltaMetric;
  newSourceCount?: DeltaMetric;
  interpretation?: string;
};

export type ChangeVerificationResult = {
  verificationState: ChangeVerificationState;
  comparisonEligible: boolean;
  reasonCodes: string[];
  metricSnapshot: Record<string, unknown>;
  limitations: string[];
  causalAttribution: "not_claimed";
};

function finiteDelta(metric: DeltaMetric | undefined): number | null {
  const delta = metric?.delta;
  return typeof delta === "number" && Number.isFinite(delta) ? delta : null;
}

export function assessChangeVerification(input: {
  followUpStatus: "complete" | "incomparable";
  outcome: FollowUpOutcome;
  limitation?: string | null;
}): ChangeVerificationResult {
  const limitation = input.limitation?.trim() || "Observed before-and-after association only; no causal attribution is claimed.";
  const metricSnapshot = {
    brandPresencePct: input.outcome.brandPresencePct || null,
    firstMentionPct: input.outcome.firstMentionPct || null,
    citationCount: input.outcome.citationCount || null,
    newSourceCount: input.outcome.newSourceCount || null,
    baselineRunId: input.outcome.baselineRunId || null,
    followUpRunId: input.outcome.followUpRunId || null,
    interpretation: input.outcome.interpretation || null,
  };

  if (input.followUpStatus === "incomparable") {
    return {
      verificationState: "INSUFFICIENT_EVIDENCE",
      comparisonEligible: false,
      reasonCodes: ["incomparable_measurement"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  const primary = [
    finiteDelta(input.outcome.brandPresencePct),
    finiteDelta(input.outcome.firstMentionPct),
  ].filter((value): value is number => value !== null);

  if (!primary.length) {
    return {
      verificationState: "INSUFFICIENT_EVIDENCE",
      comparisonEligible: false,
      reasonCodes: ["primary_deltas_missing"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  const hasPositive = primary.some((value) => value > 0);
  const hasNegative = primary.some((value) => value < 0);
  const allZero = primary.every((value) => value === 0);

  if (hasPositive && hasNegative) {
    return {
      verificationState: "INSUFFICIENT_EVIDENCE",
      comparisonEligible: true,
      reasonCodes: ["mixed_direction"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  if (hasPositive) {
    return {
      verificationState: "IMPROVED",
      comparisonEligible: true,
      reasonCodes: ["primary_recommendation_metrics_positive"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  if (hasNegative) {
    return {
      verificationState: "WORSENED",
      comparisonEligible: true,
      reasonCodes: ["primary_recommendation_metrics_negative"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  if (allZero) {
    return {
      verificationState: "UNCHANGED",
      comparisonEligible: true,
      reasonCodes: ["primary_recommendation_metrics_unchanged"],
      metricSnapshot,
      limitations: [limitation],
      causalAttribution: "not_claimed",
    };
  }

  return {
    verificationState: "INSUFFICIENT_EVIDENCE",
    comparisonEligible: false,
    reasonCodes: ["measurement_not_classifiable"],
    metricSnapshot,
    limitations: [limitation],
    causalAttribution: "not_claimed",
  };
}
