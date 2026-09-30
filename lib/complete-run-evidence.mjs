/**
 * Canonical fail-closed completeness gate for bounded finalized run history.
 *
 * Any customer-facing metric derived from an independently fetched answer set
 * must prove that the full persisted verified set is present. A bounded subset,
 * duplicate ID, duplicate question/provider slot, cross-run row, unfinished run,
 * or missing persisted denominator fails closed.
 */
export const MAX_COMPLETE_RUN_HISTORY_RUNS = 50;
export const MAX_COMPLETE_RUN_HISTORY_ANSWERS = 2000;

const positiveCount = (value) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function assessCompleteRunHistory(runs, rows) {
  if (!Array.isArray(runs) || !runs.length) {
    return { ok: false, reason: "NO_REVIEWED_RUNS" };
  }
  if (runs.length > MAX_COMPLETE_RUN_HISTORY_RUNS) {
    return { ok: false, reason: "RUN_HISTORY_SATURATED" };
  }
  if (runs.some((run) =>
    !run || typeof run.id !== "string" || !run.id ||
    !["complete", "partial"].includes(run.status) ||
    !positiveCount(run.answer_count))) {
    return { ok: false, reason: "INVALID_RECORDED_RUN_DENOMINATOR" };
  }

  const expected = runs.reduce((sum, run) => sum + run.answer_count, 0);
  // Keep one response slot available so an unexpected extra verified answer
  // cannot disappear behind the query cap and impersonate a complete batch.
  if (!Number.isSafeInteger(expected) || expected < 1 ||
      expected >= MAX_COMPLETE_RUN_HISTORY_ANSWERS) {
    return { ok: false, reason: "ANSWER_HISTORY_SATURATED" };
  }
  if (!Array.isArray(rows) || rows.length !== expected ||
      rows.length >= MAX_COMPLETE_RUN_HISTORY_ANSWERS) {
    return { ok: false, reason: "VERIFIED_ANSWER_COUNT_MISMATCH" };
  }

  const runById = new Map(runs.map((run) => [run.id, run]));
  const ids = new Set();
  const slotsByRun = new Map(runs.map((run) => [run.id, new Set()]));
  const counts = new Map(runs.map((run) => [run.id, 0]));

  for (const row of rows) {
    if (!row || !runById.has(row.run_id) || row.review_status !== "verified" ||
        typeof row.id !== "string" || !row.id ||
        typeof row.prompt_key !== "string" || !row.prompt_key.trim() ||
        typeof row.provider !== "string" || !row.provider.trim()) {
      return { ok: false, reason: "INVALID_VERIFIED_ANSWER_PROVENANCE" };
    }
    if (ids.has(row.id)) return { ok: false, reason: "DUPLICATE_ANSWER_ID" };
    ids.add(row.id);

    const slots = slotsByRun.get(row.run_id);
    const slot = row.prompt_key.trim() + "\u0000" + row.provider.trim();
    if (slots.has(slot)) return { ok: false, reason: "DUPLICATE_QUESTION_PROVIDER_SLOT" };
    slots.add(slot);
    counts.set(row.run_id, counts.get(row.run_id) + 1);
  }

  for (const run of runs) {
    if (counts.get(run.id) !== run.answer_count) {
      return { ok: false, reason: "RUN_ANSWER_COUNT_MISMATCH" };
    }
  }
  return { ok: true, reason: null };
}
