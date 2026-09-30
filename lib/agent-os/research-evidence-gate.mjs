/**
 * Pure fail-closed evidence gate shared by the reviewed-evidence action and
 * Research/Insight reasoner. Keep this module dependency-free so the same
 * contract can be exercised by Node's raw test runner.
 */
export const MAX_RESEARCH_REASONING_ANSWERS = 24;

export function assessResearchReasoningAnswerSet(run, answers) {
  if (!run || !["complete", "partial"].includes(run.status)) {
    return { ok: false, reason: "reviewed_terminal_run_not_found" };
  }
  const expected = Number(run.answer_count);
  if (!Number.isSafeInteger(expected) || expected <= 0) {
    return { ok: false, reason: "invalid_recorded_answer_count" };
  }
  if (expected > MAX_RESEARCH_REASONING_ANSWERS) {
    return { ok: false, reason: "recorded_answer_set_exceeds_reasoning_packet" };
  }
  if (!Array.isArray(answers) || answers.length !== expected) {
    return { ok: false, reason: "incomplete_verified_answer_set" };
  }
  if (answers.some((answer) => answer?.run_id !== run.id)) {
    return { ok: false, reason: "cross_run_answer_leakage" };
  }
  if (new Set(answers.map((answer) => answer?.id)).size !== answers.length) {
    return { ok: false, reason: "duplicate_answer_ids" };
  }
  const slots = answers.map((answer) => [
    String(answer?.prompt_key || "").trim().toLowerCase(),
    String(answer?.provider || "").trim().toLowerCase(),
  ]);
  if (slots.some(([promptKey, provider]) => !promptKey || !provider)) {
    return { ok: false, reason: "missing_question_or_provider_identity" };
  }
  const slotKeys = slots.map(([promptKey, provider]) => `${promptKey}\u0000${provider}`);
  if (new Set(slotKeys).size !== slotKeys.length) {
    return { ok: false, reason: "duplicate_question_provider_slots" };
  }
  return { ok: true, reason: null };
}
