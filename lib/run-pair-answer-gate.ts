// Pure read-side boundary shared by customer run comparison and reviewed
// change notifications. A matching *subset* is never a comparable collection.
import {
  assessExactQuestionComparability,
  coerceComparableMeasurementContext,
  type ComparableQuestionSlot,
  type ExactComparability,
} from "./intelligence-comparability.ts";

export const MAX_VERIFIED_RUN_PAIR_ANSWERS = 500;
export type ComparableStoredRun = {
  id: string;
  answer_count: number | null;
};
export type ComparableStoredAnswer = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  measurement_context_json: unknown;
};

export function validPairedRunAnswerBudget(
  earlier: ComparableStoredRun,
  later: ComparableStoredRun,
): ExactComparability {
  if (earlier.id === later.id) {
    return { comparable: false, reason: "Choose two distinct human-reviewed collections." };
  }
  if (![earlier.answer_count, later.answer_count].every(
    (count) => typeof count === "number" && Number.isSafeInteger(count) && count > 0,
  )) {
    return { comparable: false, reason: "An independently recorded positive answer count is unavailable for at least one reviewed collection." };
  }
  if ((earlier.answer_count as number) + (later.answer_count as number) > MAX_VERIFIED_RUN_PAIR_ANSWERS) {
    return { comparable: false, reason: "The pair exceeds the bounded verified-answer reporting read; no partial subset was compared." };
  }
  return { comparable: true, reason: null };
}

/**
 * Both full verified answer sets must match independently persisted run counts.
 * Duplicate key/provider slots, malformed provenance, a third run, or a
 * silently truncated PostgREST response invalidate the *entire* comparison.
 */
export function assessCompleteVerifiedRunPair(
  earlier: ComparableStoredRun,
  later: ComparableStoredRun,
  rows: ComparableStoredAnswer[],
): ExactComparability {
  const budget = validPairedRunAnswerBudget(earlier, later);
  if (!budget.comparable) return budget;
  if (rows.length > MAX_VERIFIED_RUN_PAIR_ANSWERS
    || rows.some((row) => row.run_id !== earlier.id && row.run_id !== later.id)) {
    return { comparable: false, reason: "The scoped verified-answer response contained unexpected or excessive rows." };
  }
  const first = rows.filter((row) => row.run_id === earlier.id);
  const second = rows.filter((row) => row.run_id === later.id);
  if (first.length !== earlier.answer_count || second.length !== later.answer_count) {
    return { comparable: false, reason: "The complete verified answer set was not independently readable for both reviewed collections." };
  }
  const unique = (answers: ComparableStoredAnswer[]) =>
    answers.every((answer) => Boolean(answer.prompt_key?.trim() && answer.provider?.trim()))
    && new Set(answers.map((answer) => [answer.prompt_key, answer.provider].join("\u0000"))).size === answers.length;
  if (!unique(first) || !unique(second)) {
    return { comparable: false, reason: "Duplicate or unidentified question/provider answer slots make comparison ambiguous." };
  }
  const slots: ComparableQuestionSlot[] = rows.map((answer) => ({
    runId: answer.run_id,
    promptKey: answer.prompt_key,
    promptText: answer.prompt_text,
    provider: answer.provider,
    model: answer.model,
    measurementContext: coerceComparableMeasurementContext(answer.measurement_context_json),
  }));
  return assessExactQuestionComparability(later.id, earlier.id, slots);
}
