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

export function activationMilestoneTimestamp(
  account: ActivationMilestoneFacts,
  asOfMs: number,
): number | null {
  const milestones = [
    account.workspaceConfiguredAt,
    account.fiveQuestionsApprovedAt,
    account.firstMeasurementAt,
    account.firstRecordReviewedAt,
    account.firstActionCreatedAt,
    account.firstActionAssignedAt,
  ];
  let previous = Number.NEGATIVE_INFINITY;
  if (account.createdAt !== undefined && account.createdAt !== null) {
    const created = observedTimestamp(account.createdAt, asOfMs);
    if (created === null) return null;
    previous = created;
  }
  for (const value of milestones) {
    const at = observedTimestamp(value, asOfMs);
    if (at === null || at < previous) return null;
    previous = at;
  }
  return previous;
}
