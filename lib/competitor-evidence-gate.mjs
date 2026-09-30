/**
 * Backward-compatible competitor-history facade over the canonical complete
 * finalized-run evidence gate.
 */
import {
  assessCompleteRunHistory,
  MAX_COMPLETE_RUN_HISTORY_ANSWERS,
  MAX_COMPLETE_RUN_HISTORY_RUNS,
} from "./complete-run-evidence.mjs";

export const MAX_COMPETITOR_HISTORY_RUNS = MAX_COMPLETE_RUN_HISTORY_RUNS;
export const MAX_COMPETITOR_HISTORY_ANSWERS = MAX_COMPLETE_RUN_HISTORY_ANSWERS;

export function assessCompleteCompetitorHistory(runs, rows) {
  return assessCompleteRunHistory(runs, rows);
}
