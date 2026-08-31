export type CohortAccountFacts = {
  organizationId: string;
  includedInCompanyKpis: boolean;
  workspaceConfiguredAt: string | null;
  fiveQuestionsApprovedAt: string | null;
  firstMeasurementAt: string | null;
  firstRecordReviewedAt: string | null;
  firstActionCreatedAt: string | null;
  firstActionAssignedAt: string | null;
  activityAt: string[];
};

export type MonthlyActivationCohort = {
  cohortMonth: string;
  activatedAccounts: number;
  eligibleForNextMonthRetention: number;
  retainedNextMonthAccounts: number;
  nextMonthRetentionPct: number | null;
};

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function activationTimestamp(account: CohortAccountFacts) {
  if (
    timestamp(account.workspaceConfiguredAt) === null
    || timestamp(account.fiveQuestionsApprovedAt) === null
    || timestamp(account.firstMeasurementAt) === null
    || timestamp(account.firstRecordReviewedAt) === null
    || timestamp(account.firstActionCreatedAt) === null
  ) return null;
  return timestamp(account.firstActionAssignedAt);
}

function monthStartUtc(value: number) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function addUtcMonths(value: number, months: number) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
}

function cohortKey(value: number) {
  return new Date(value).toISOString().slice(0, 7);
}

function hasActivityBetween(account: CohortAccountFacts, start: number, end: number) {
  return account.activityAt.some((value) => {
    const at = timestamp(value);
    return at !== null && at >= start && at < end;
  });
}

/**
 * Groups real KPI-eligible accounts by the month they cross every activation
 * boundary through first action ownership. Next-month retention is emitted only
 * after that entire calendar observation month has closed, so immature cohorts
 * remain explicitly unavailable instead of being reported as zero retention.
 */
export function deriveMonthlyActivationCohorts(accounts: CohortAccountFacts[], now = new Date()): MonthlyActivationCohort[] {
  const groups = new Map<number, CohortAccountFacts[]>();
  for (const account of accounts) {
    if (!account.includedInCompanyKpis) continue;
    const activatedAt = activationTimestamp(account);
    if (activatedAt === null) continue;
    const start = monthStartUtc(activatedAt);
    groups.set(start, [...(groups.get(start) || []), account]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, cohort]) => {
      const nextStart = addUtcMonths(start, 1);
      const nextEnd = addUtcMonths(start, 2);
      const mature = now.getTime() >= nextEnd;
      const retained = mature ? cohort.filter((account) => hasActivityBetween(account, nextStart, nextEnd)).length : 0;
      return {
        cohortMonth: cohortKey(start),
        activatedAccounts: cohort.length,
        eligibleForNextMonthRetention: mature ? cohort.length : 0,
        retainedNextMonthAccounts: retained,
        nextMonthRetentionPct: mature && cohort.length ? Math.round((retained / cohort.length) * 10_000) / 100 : null,
      };
    });
}
