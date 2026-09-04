export const ACQUISITION_QUALIFICATION_THRESHOLD = 75 as const;

export const ACQUISITION_SCORE_MAXIMA = {
  buyerQuestionCommercialFit: 20,
  competitiveDensity: 15,
  interventionCapability: 15,
  aiDiscoveryUrgency: 15,
  evidenceSensitivity: 10,
  measurementFit: 10,
  budgetAuthorityPath: 10,
  thirtyDayActionability: 5,
} as const;

export type AcquisitionScoreDimension = keyof typeof ACQUISITION_SCORE_MAXIMA;

export type AcquisitionQualificationInput = {
  scores: Record<AcquisitionScoreDimension, number>;
  sourceCount: number;
  whyNow: string | null;
  disqualifiers?: readonly string[];
};

export type AcquisitionQualificationResult = {
  score: number;
  qualified: boolean;
  threshold: typeof ACQUISITION_QUALIFICATION_THRESHOLD;
  reasonCodes: string[];
  whyNow: string | null;
  sourceCount: number;
};

function clampInteger(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function normalizeText(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export function qualifyAcquisitionCandidate(input: AcquisitionQualificationInput): AcquisitionQualificationResult {
  const normalizedScores = Object.fromEntries(
    Object.entries(ACQUISITION_SCORE_MAXIMA).map(([dimension, max]) => [
      dimension,
      clampInteger(input.scores[dimension as AcquisitionScoreDimension], max),
    ]),
  ) as Record<AcquisitionScoreDimension, number>;

  const score = Object.values(normalizedScores).reduce((sum, value) => sum + value, 0);
  const sourceCount = clampInteger(input.sourceCount, 1000);
  const whyNow = normalizeText(input.whyNow);
  const disqualifiers = (input.disqualifiers ?? []).map((item) => normalizeText(item, 120)).filter(Boolean) as string[];

  const reasonCodes: string[] = [];
  if (score >= ACQUISITION_QUALIFICATION_THRESHOLD) reasonCodes.push("SCORE_THRESHOLD_MET");
  else reasonCodes.push("SCORE_THRESHOLD_NOT_MET");
  if (sourceCount > 0) reasonCodes.push("PUBLIC_EVIDENCE_PRESENT");
  else reasonCodes.push("NO_PUBLIC_EVIDENCE");
  if (whyNow) reasonCodes.push("WHY_NOW_PRESENT");
  else reasonCodes.push("WHY_NOW_MISSING");
  if (disqualifiers.length > 0) reasonCodes.push("DISQUALIFIED");

  return {
    score,
    qualified:
      score >= ACQUISITION_QUALIFICATION_THRESHOLD &&
      sourceCount > 0 &&
      Boolean(whyNow) &&
      disqualifiers.length === 0,
    threshold: ACQUISITION_QUALIFICATION_THRESHOLD,
    reasonCodes,
    whyNow,
    sourceCount,
  };
}
