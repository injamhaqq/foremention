import {
  assessExactQuestionComparability,
  coerceComparableMeasurementContext,
  type ExactComparability,
  type ComparableQuestionSlot,
} from "./intelligence-comparability.ts";
import type { OutcomeLedgerFollowUpRow, OutcomeLedgerRunRow } from "./outcome-ledger.ts";

export type OutcomeContextRun = OutcomeLedgerRunRow & {
  methodology_version: string | null;
  answer_count: number | null;
};

export type OutcomeContextAnswer = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  measurement_context_json: unknown;
};

/**
 * This independent reporting gate is defense-in-depth for #351. A persisted
 * "complete" Resolution follow-up is not sufficient evidence of full material
 * context parity until the forward database migration is independently released.
 * No missing historical versions or unreadable verified answers are invented.
 */
export function evaluateFollowUpContextParity(input: {
  followUps: OutcomeLedgerFollowUpRow[];
  runs: OutcomeContextRun[];
  verifiedAnswers: OutcomeContextAnswer[];
  saturatedRunIds?: ReadonlySet<string>;
}): Map<string, ExactComparability> {
  const runById = new Map(input.runs.map((run) => [run.id, run]));
  const answersByRun = new Map<string, OutcomeContextAnswer[]>();
  for (const answer of input.verifiedAnswers) {
    answersByRun.set(answer.run_id, [...(answersByRun.get(answer.run_id) || []), answer]);
  }

  const results = new Map<string, ExactComparability>();
  const blocked = (reason: string): ExactComparability => ({ comparable: false, reason });
  for (const followUp of input.followUps) {
    if (followUp.status !== "complete") continue;
    const baseline = runById.get(followUp.baseline_run_id);
    const later = followUp.rerun_id ? runById.get(followUp.rerun_id) : undefined;
    if (!baseline || !later || baseline.id === later.id) {
      results.set(followUp.id, blocked("A distinct, readable baseline and later run are required."));
      continue;
    }
    if (!["complete","partial"].includes(baseline.status) || !["complete","partial"].includes(later.status)) {
      results.set(followUp.id, blocked("Both reviewed runs must be finalized."));
      continue;
    }
    if (!baseline.methodology_version?.trim() || baseline.methodology_version !== later.methodology_version) {
      results.set(followUp.id, blocked("The recorded methodology version changed or is unavailable."));
      continue;
    }
    if (input.saturatedRunIds?.has(baseline.id) || input.saturatedRunIds?.has(later.id)) {
      results.set(followUp.id, blocked("The verified answer set exceeded the bounded reporting read."));
      continue;
    }

    const firstAnswers = answersByRun.get(baseline.id) || [];
    const secondAnswers = answersByRun.get(later.id) || [];
    const completeAnswerSet = (run: OutcomeContextRun, answers: OutcomeContextAnswer[]) =>
      typeof run.answer_count === "number"
      && Number.isInteger(run.answer_count)
      && run.answer_count > 0
      && answers.length === run.answer_count;
    if (!completeAnswerSet(baseline, firstAnswers) || !completeAnswerSet(later, secondAnswers)) {
      results.set(followUp.id, blocked("A complete verified answer set could not be independently read for both runs."));
      continue;
    }

    const uniqueSlots = (answers: OutcomeContextAnswer[]) =>
      new Set(answers.map((answer) => [answer.prompt_key, answer.provider].join("\u0000"))).size === answers.length;
    if (!uniqueSlots(firstAnswers) || !uniqueSlots(secondAnswers)) {
      results.set(followUp.id, blocked("Duplicate question/provider answer slots make the later comparison ambiguous."));
      continue;
    }

    const slots: ComparableQuestionSlot[] = [...firstAnswers, ...secondAnswers].map((answer) => ({
      runId: answer.run_id,
      promptKey: answer.prompt_key,
      promptText: answer.prompt_text,
      provider: answer.provider,
      model: answer.model,
      measurementContext: coerceComparableMeasurementContext(answer.measurement_context_json),
    }));
    results.set(followUp.id, assessExactQuestionComparability(later.id, baseline.id, slots));
  }
  return results;
}
