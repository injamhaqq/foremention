/**
 * First-party activation facts are chronological observations, not six
 * independent flags. Reject invalid, reversed or future-dated milestones
 * before counting activation and assigning an account to a monthly cohort.
 */
export type ActivationMilestoneFacts = {
  createdAt?: string | null;
  workspaceConfiguredAt: string | null;
  fiveQuestionsApprovedAt: string | null;
  firstMeasurementAt: string | null;
  firstRecordReviewedAt: string | null;
  firstActionCreatedAt: string | null;
  firstActionAssignedAt: string | null;
};

export function observedTimestamp(value: string | null | undefined, asOfMs: number): number | null {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(asOfMs)) return null;
  const at = new Date(value).getTime();
  return Number.isFinite(at) && at <= asOfMs ? at : null;
}

const ACTIVATION_STAGES: Array<keyof Omit<ActivationMilestoneFacts, "createdAt">> = [
  "workspaceConfiguredAt",
  "fiveQuestionsApprovedAt",
  "firstMeasurementAt",
  "firstRecordReviewedAt",
  "firstActionCreatedAt",
  "firstActionAssignedAt",
];

/**
 * Return the timestamp of a completed, chronological activation stage.
 * Every earlier stage must actually have occurred by the as-of time; later
 * stages are not required to measure legitimate partial-funnel conversion.
 * Stage 3 is first measurement, 4 is reviewed Record, 5 is created action.
 */
export function completedActivationStageAt(
  account: ActivationMilestoneFacts,
  asOfMs: number,
  stageCount: number,
): number | null {
  if (!Number.isInteger(stageCount) || stageCount < 1 || stageCount > ACTIVATION_STAGES.length) return null;
  let previous = Number.NEGATIVE_INFINITY;
  if (account.createdAt !== undefined && account.createdAt !== null) {
    const created = observedTimestamp(account.createdAt, asOfMs);
    if (created === null) return null;
    previous = created;
  }
  for (const field of ACTIVATION_STAGES.slice(0, stageCount)) {
    const at = observedTimestamp(account[field], asOfMs);
    if (at === null || at < previous) return null;
    previous = at;
  }
  return previous;
}

export function activationMilestoneTimestamp(
  account: ActivationMilestoneFacts,
  asOfMs: number,
): number | null {
  return completedActivationStageAt(account, asOfMs, ACTIVATION_STAGES.length);
}
