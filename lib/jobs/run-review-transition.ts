/**
 * Resolve an uncertain PostgREST acknowledgement after a compare-and-set
 * transition from running -> review.
 *
 * A cancelled/failed run must never be resurrected by the collector, and an
 * acknowledgement lost after a successful commit must not cause us to retry
 * provider collection or silently overwrite already reviewed evidence.
 */
export type ReviewTransitionSnapshot = {
  id: string;
  status: string;
  answer_count: number | null;
  citation_count: number | null;
  actual_cost_usd: number | string | null;
};

export type ExpectedReviewTransition = {
  runId: string;
  answerCount: number;
  citationCount: number;
  actualCostUsd: number;
};

export type ReviewTransitionOutcome = "committed" | "reconciled" | "terminal";

export async function confirmRunReviewTransition(
  expected: ExpectedReviewTransition,
  effects: {
    markReviewIfRunning: () => Promise<Array<{ id: string }>>;
    reload: () => Promise<ReviewTransitionSnapshot[]>;
  },
): Promise<ReviewTransitionOutcome> {
  let uncertainError: unknown;
  try {
    const updated = await effects.markReviewIfRunning();
    if (updated.some((row) => row.id === expected.runId)) return "committed";
  } catch (error) {
    uncertainError = error;
  }

  // No changed row or lost acknowledgement: reload the persisted state.
  const current = (await effects.reload())[0];
  if (
    current?.id === expected.runId
    && current.status === "review"
    && Number(current.answer_count) === expected.answerCount
    && Number(current.citation_count) === expected.citationCount
    && current.actual_cost_usd !== null
    && Math.abs(Number(current.actual_cost_usd) - expected.actualCostUsd) < 0.000001
  ) {
    return "reconciled";
  }

  if (current?.id === expected.runId && ["cancelled", "failed", "complete", "partial"].includes(current.status)) {
    return "terminal";
  }

  // Queued/running, missing, or inconsistent review data are not successes.
  if (uncertainError) throw uncertainError;
  throw new Error("Collection review transition could not be confirmed from persisted state.");
}
