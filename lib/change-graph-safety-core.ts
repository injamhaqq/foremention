export type ChangeGraphSafetyRun = {
  id: string;
  status: string;
};

export type ChangeGraphSafetyAnswer = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
};

export type ChangeGraphSafetyAssessment = {
  comparable: boolean;
  reason: string | null;
};

const reviewedTerminalStatuses = new Set(["complete", "partial"]);
const normalizedQuestion = (value: string) => value.replace(/\s+/g, " ").trim();

function answerIdentity(answer: ChangeGraphSafetyAnswer) {
  return [
    answer.prompt_key,
    normalizedQuestion(answer.prompt_text || ""),
    answer.provider,
    answer.model || "model-not-recorded",
  ].join("\u0000");
}

/**
 * Customer-facing comparability guard for dated AI observations.
 * A stable prompt key is not sufficient: exact persisted question text,
 * provider, exact model, and reviewed terminal run state must all match.
 */
export function assessChangeGraphSafety(
  latestRunId: string,
  previousRunId: string | null,
  runs: ChangeGraphSafetyRun[],
  answers: ChangeGraphSafetyAnswer[],
): ChangeGraphSafetyAssessment {
  if (!previousRunId) return { comparable: false, reason: "A second reviewed collection is required." };

  const runById = new Map(runs.map((run) => [run.id, run]));
  const latestRun = runById.get(latestRunId);
  const previousRun = runById.get(previousRunId);
  if (!latestRun || !previousRun) {
    return { comparable: false, reason: "Both collection records must be available in the active workspace." };
  }
  if (!reviewedTerminalStatuses.has(latestRun.status) || !reviewedTerminalStatuses.has(previousRun.status)) {
    return { comparable: false, reason: "Both collections must finish human review before movement is reported." };
  }

  const scoped = answers.filter((answer) => answer.run_id === latestRunId || answer.run_id === previousRunId);
  if (scoped.some((answer) => !answer.prompt_text || !normalizedQuestion(answer.prompt_text))) {
    return { comparable: false, reason: "Exact buyer-question text is missing from at least one reviewed answer." };
  }
  if (scoped.some((answer) => !answer.model)) {
    return { comparable: false, reason: "Exact model provenance is missing from at least one reviewed answer." };
  }

  const latestKeys = scoped.filter((answer) => answer.run_id === latestRunId).map(answerIdentity).sort();
  const previousKeys = scoped.filter((answer) => answer.run_id === previousRunId).map(answerIdentity).sort();
  if (!latestKeys.length || latestKeys.length !== previousKeys.length || latestKeys.some((key, index) => key !== previousKeys[index])) {
    return { comparable: false, reason: "The exact reviewed buyer-question/provider/model matrix changed between collections." };
  }

  return { comparable: true, reason: null };
}
