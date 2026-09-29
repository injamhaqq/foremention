/**
 * Trust boundary between a bounded PostgREST read and customer-facing
 * observed movement. The exact-question parity check cannot see answers
 * that were omitted by a result cap, review filter, or project mismatch.
 * This check must pass before comparing content.
 */
export type CountedReviewedRun = { id: string; answer_count: number | null };
export type VerifiedAnswerIdentity = { run_id: string; prompt_key: string; provider: string };
export type VerifiedAnswerCompleteness = {
  complete: boolean;
  reason: string | null;
};
const blocked = (reason: string): VerifiedAnswerCompleteness => ({ complete: false, reason });

export function assessBoundedVerifiedAnswerCompleteness(
  runs: readonly CountedReviewedRun[],
  rows: readonly VerifiedAnswerIdentity[],
  maxRows: number,
): VerifiedAnswerCompleteness {
  if (!Number.isSafeInteger(maxRows) || maxRows < 2) return blocked("The verified-answer read cap is invalid.");
  if (runs.length !== 2 || !runs[0].id || !runs[1].id || runs[0].id === runs[1].id) {
    return blocked("Exactly two distinct source-run identities are required.");
  }
  if (rows.length >= maxRows) {
    return blocked("The verified-answer read reached the configured boundary; completeness is unknown.");
  }
  const ids = new Set(runs.map((run) => run.id));
  if (rows.some((row) => !ids.has(row.run_id))) {
    return blocked("The verified-answer read included an unexpected source run.");
  }
  for (const run of runs) {
    if (typeof run.answer_count !== "number" || !Number.isSafeInteger(run.answer_count) || run.answer_count < 1) {
      return blocked("A valid independent source-run answer count is missing.");
    }
    const matched = rows.filter((row) => row.run_id === run.id);
    if (matched.length !== run.answer_count) {
      return blocked("An independent source-run answer count does not match the verified rows read.");
    }
    if (matched.some((row) => !row.prompt_key?.trim() || !row.provider?.trim())) {
      return blocked("A verified answer lacks source buyer-question or provider identity.");
    }
    const signatures = matched.map((row) => [row.prompt_key, row.provider].join("\u0000"));
    if (new Set(signatures).size !== signatures.length) {
      return blocked("Duplicate verified buyer-question/provider slots make the comparison ambiguous.");
    }
  }
  return { complete: true, reason: null };
}
