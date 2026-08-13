export type ComparableObservation = {
  runId: string;
  promptKey: string;
  promptText: string | null;
  provider: string;
  model: string | null;
};

export type ComparableRun = {
  id: string;
  methodologyVersion: string | null;
};

export type ComparabilityResult = {
  signature: string | null;
  reason: "comparable" | "missing_methodology" | "missing_exact_model" | "missing_question_text" | "empty_reviewed_matrix";
  missingExactModels: number;
  missingQuestionTexts: number;
};

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

export function comparableObservationKey(observation: ComparableObservation) {
  if (!observation.model || !normalize(observation.promptText || "")) return null;
  return [
    observation.promptKey,
    normalize(observation.promptText || ""),
    observation.provider,
    observation.model,
  ].join("\u0000");
}

export function comparableRunSignature(run: ComparableRun, observations: ComparableObservation[]): ComparabilityResult {
  const scoped = observations.filter((observation) => observation.runId === run.id);
  const missingExactModels = scoped.filter((observation) => !observation.model).length;
  const missingQuestionTexts = scoped.filter((observation) => !normalize(observation.promptText || "")).length;

  if (!run.methodologyVersion) return { signature: null, reason: "missing_methodology", missingExactModels, missingQuestionTexts };
  if (!scoped.length) return { signature: null, reason: "empty_reviewed_matrix", missingExactModels, missingQuestionTexts };
  if (missingExactModels) return { signature: null, reason: "missing_exact_model", missingExactModels, missingQuestionTexts };
  if (missingQuestionTexts) return { signature: null, reason: "missing_question_text", missingExactModels, missingQuestionTexts };

  const keys = scoped.map(comparableObservationKey);
  if (keys.some((key) => !key)) return { signature: null, reason: "empty_reviewed_matrix", missingExactModels, missingQuestionTexts };
  return {
    signature: `${run.methodologyVersion}\u0002${(keys as string[]).sort().join("\u0001")}`,
    reason: "comparable",
    missingExactModels,
    missingQuestionTexts,
  };
}

export function findComparablePrior(
  latest: ComparableRun,
  candidates: ComparableRun[],
  observations: ComparableObservation[],
) {
  const latestResult = comparableRunSignature(latest, observations);
  if (!latestResult.signature) return { latest: latestResult, previous: null as ComparableRun | null };
  const previous = candidates.find((candidate) => {
    const candidateResult = comparableRunSignature(candidate, observations);
    return candidateResult.signature !== null && candidateResult.signature === latestResult.signature;
  }) || null;
  return { latest: latestResult, previous };
}
