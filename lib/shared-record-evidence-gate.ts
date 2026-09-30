/**
 * Read-only, fail-closed integrity gate for a private expiring Record share.
 * A PostgREST-limited subset must never become an apparently complete
 * reviewed executive summary. This verifies review-set completeness only;
 * it DOES NOT verify citation relevance, source truth or causation.
 */
export const MAX_SHARED_RECORD_ANSWERS = 200;

export type SharedRecordRun = {
  id: string;
  status: string;
  answer_count: number | null;
};

export type SharedRecordAnswer = {
  id: string;
  run_id: string;
  prompt_key: string | null;
  provider: string | null;
  review_status: string;
};

export type SharedRecordEvidenceState = {
  fullyLoaded: boolean;
  reviewComplete: boolean;
  reviewedCount: number;
  reason: string | null;
};

function unavailable(reason: string): SharedRecordEvidenceState {
  return { fullyLoaded: false, reviewComplete: false, reviewedCount: 0, reason };
}

/**
 * Runs may legitimately be shared while still waiting for review. Those
 * observations remain visible when the complete recorded set is readable,
 * but they cannot be described as having completed human review.
 */
export function assessSharedRecordEvidenceSet(
  run: SharedRecordRun,
  answers: SharedRecordAnswer[],
): SharedRecordEvidenceState {
  if (!Number.isSafeInteger(run.answer_count) || !run.answer_count || run.answer_count < 1) {
    return unavailable("An independently persisted positive answer count is unavailable.");
  }
  if (run.answer_count > MAX_SHARED_RECORD_ANSWERS) {
    return unavailable("The Record exceeds the bounded private-share answer view.");
  }
  if (answers.length !== run.answer_count || answers.length > MAX_SHARED_RECORD_ANSWERS) {
    return unavailable("The complete persisted answer set could not be independently read.");
  }
  if (answers.some((answer) =>
    answer.run_id !== run.id
    || !answer.id
    || !answer.prompt_key?.trim()
    || !answer.provider?.trim()
  )) {
    return unavailable("Answer provenance is incomplete or includes another collection.");
  }

  // Disallow duplicate IDs or question/provider slots, which could otherwise
  // make a truncated or duplicated collection look fully reviewed.
  if (new Set(answers.map((answer) => answer.id)).size !== answers.length
    || new Set(answers.map((answer) => [answer.prompt_key, answer.provider].join("\u0000"))).size !== answers.length) {
    return unavailable("Duplicate answer IDs or question/provider slots make the Record ambiguous.");
  }

  const reviewedCount = answers.filter((answer) => answer.review_status === "verified").length;
  const reviewComplete = ["complete", "partial"].includes(run.status)
    && reviewedCount === run.answer_count;
  return {
    fullyLoaded: true,
    reviewComplete,
    reviewedCount,
    reason: reviewComplete ? null : "Some recorded answers are unreviewed or the collection is not finalized.",
  };
}
