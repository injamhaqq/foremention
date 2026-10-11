/**
 * A bounded Research/Insight prompt must never silently summarize a truncated
 * verified answer set as if it represented the complete customer collection.
 * The caller supplies the independent exact Record answer denominator after
 * a successful scoped integrity check and uses a +1 sentinel when loading rows.
 */
export const MAX_RESEARCH_REASONING_ANSWERS = 24;
export const MAX_RESEARCH_REASONING_SOURCES = 40;

export function assessResearchReasoningCoverage(
  expectedVerifiedAnswerCount: number,
  observedVerifiedAnswerCount: number,
  observedSourceCount: number,
): { ok: true; reason: null } | { ok: false; reason: string } {
  if (!Number.isSafeInteger(expectedVerifiedAnswerCount) || expectedVerifiedAnswerCount <= 0) {
    return { ok: false, reason: "reasoning_missing_verified_answer_denominator" };
  }
  if (expectedVerifiedAnswerCount > MAX_RESEARCH_REASONING_ANSWERS) {
    return { ok: false, reason: "reasoning_answer_budget_exceeded" };
  }
  if (!Number.isSafeInteger(observedVerifiedAnswerCount)
      || observedVerifiedAnswerCount !== expectedVerifiedAnswerCount) {
    return { ok: false, reason: "reasoning_verified_answer_set_incomplete" };
  }
  if (!Number.isSafeInteger(observedSourceCount) || observedSourceCount < 0
      || observedSourceCount > MAX_RESEARCH_REASONING_SOURCES) {
    return { ok: false, reason: "reasoning_source_budget_exceeded" };
  }
  return { ok: true, reason: null };
}
