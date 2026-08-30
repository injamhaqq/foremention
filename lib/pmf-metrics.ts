export type PmfMetricKey =
  | "activation_rate"
  | "first_record_review_rate"
  | "action_creation_rate"
  | "second_cycle_rate"
  | "wau_accounts"
  | "mau_accounts"
  | "retained_account_rate"
  | "time_to_first_value"
  | "time_to_second_cycle"
  | "design_partner_conversion"
  | "paid_conversion";

export type PmfMetricDefinition = {
  label: string;
  unit: "percent" | "accounts" | "hours";
  numerator: string;
  denominator: string;
  interpretation: string;
  requiresRealBilling?: boolean;
};

/**
 * Canonical account-level PMF metric definitions.
 *
 * These are deliberately organization-scoped, not user-event counts. An account
 * is eligible only after the company proof boundary has explicitly marked it for
 * company KPIs; internal, synthetic, benchmark, and unknown organizations must
 * never enter these denominators.
 */
export const PMF_METRIC_DEFINITIONS: Record<PmfMetricKey, PmfMetricDefinition> = {
  activation_rate: {
    label: "Activation rate",
    unit: "percent",
    numerator: "KPI-eligible accounts that reached an assigned first action after workspace setup, five approved questions, a real measurement, and a reviewed Recommendation Record.",
    denominator: "All KPI-eligible accounts in the measured cohort.",
    interpretation: "Stages 1–6 are activation. The second comparable cycle and retained workflow are retention outcomes.",
  },
  first_record_review_rate: {
    label: "First-record-review rate",
    unit: "percent",
    numerator: "KPI-eligible accounts with a first human-reviewed Recommendation Record.",
    denominator: "KPI-eligible accounts that completed a first real measurement.",
    interpretation: "Measures whether a measurement reaches the human-review boundary instead of stopping at collection output.",
  },
  action_creation_rate: {
    label: "Action creation rate",
    unit: "percent",
    numerator: "KPI-eligible accounts that created at least one action after first Record review.",
    denominator: "KPI-eligible accounts with a first reviewed Recommendation Record.",
    interpretation: "Measures conversion from inspectable evidence into a concrete next step; it is not a causal outcome claim.",
  },
  second_cycle_rate: {
    label: "Second-cycle rate",
    unit: "percent",
    numerator: "Activated KPI-eligible accounts that completed a second exact-comparable, human-reviewed cycle.",
    denominator: "Activated KPI-eligible accounts.",
    interpretation: "Primary early retention signal. Ineligible comparisons never count as completed cycles.",
  },
  wau_accounts: {
    label: "WAU accounts",
    unit: "accounts",
    numerator: "Distinct KPI-eligible accounts with at least one meaningful product activity in the trailing 7 days.",
    denominator: "Not applicable; this is a distinct-account count.",
    interpretation: "Account activity, not seats or pageviews.",
  },
  mau_accounts: {
    label: "MAU accounts",
    unit: "accounts",
    numerator: "Distinct KPI-eligible accounts with at least one meaningful product activity in the trailing 30 days.",
    denominator: "Not applicable; this is a distinct-account count.",
    interpretation: "Account activity, not seats or pageviews.",
  },
  retained_account_rate: {
    label: "Retained account rate",
    unit: "percent",
    numerator: "KPI-eligible accounts active in both the prior 30-day window and the current trailing 30-day window.",
    denominator: "KPI-eligible accounts active in the prior 30-day window.",
    interpretation: "A rolling account-retention measure. Cohort retention should also be reported by activation month once cohort sizes are real.",
  },
  time_to_first_value: {
    label: "Time to first value",
    unit: "hours",
    numerator: "Median hours from account creation to first human-reviewed Recommendation Record.",
    denominator: "KPI-eligible accounts with both timestamps; aggregate median is withheld until at least five observations exist.",
    interpretation: "First value is inspectable reviewed evidence, not signup or an unreviewed AI response.",
  },
  time_to_second_cycle: {
    label: "Time to second cycle",
    unit: "hours",
    numerator: "Median hours from first real measurement to second exact-comparable, human-reviewed cycle.",
    denominator: "KPI-eligible accounts with both timestamps; aggregate median is withheld until at least five observations exist.",
    interpretation: "Measures how quickly the workflow becomes longitudinal and repeatable.",
  },
  design_partner_conversion: {
    label: "Design-partner conversion",
    unit: "percent",
    numerator: "Accepted design-partner accounts that later become verified paying accounts.",
    denominator: "Accepted design-partner accounts.",
    interpretation: "Do not infer conversion from application submission alone; acceptance and payment must be first-party recorded facts.",
  },
  paid_conversion: {
    label: "Paid conversion",
    unit: "percent",
    numerator: "Activated KPI-eligible accounts with verified real billing/payment evidence.",
    denominator: "Activated KPI-eligible accounts measured only when real billing evidence exists.",
    interpretation: "Unavailable until billing/payment truth is connected. Configuration, pricing copy, or a checkout button never count as payment.",
    requiresRealBilling: true,
  },
};

export type PmfAccountFacts = {
  organizationId: string;
  includedInCompanyKpis: boolean;
  createdAt: string | null;
  firstMeasurementAt: string | null;
  firstRecordReviewedAt: string | null;
  firstActionCreatedAt: string | null;
  firstActionAssignedAt: string | null;
  secondComparableCycleAt: string | null;
  activityAt: string[];
  designPartnerAcceptedAt: string | null;
  payingStartedAt: string | null;
  billingVerified: boolean;
};

export type PmfMetricResult =
  | { status: "available"; value: number; unit: PmfMetricDefinition["unit"]; numerator?: number; denominator?: number; sampleSize?: number }
  | { status: "insufficient_data"; value: null; unit: PmfMetricDefinition["unit"]; reason: string; numerator?: number; denominator?: number; sampleSize?: number };

export type PmfMetrics = Record<PmfMetricKey, PmfMetricResult>;

const DAY_MS = 86_400_000;
const MIN_DURATION_SAMPLE = 5;

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function availableCount(value: number): PmfMetricResult {
  return { status: "available", value, unit: "accounts", sampleSize: value };
}

function rate(key: PmfMetricKey, numerator: number, denominator: number): PmfMetricResult {
  const unit = PMF_METRIC_DEFINITIONS[key].unit;
  if (denominator === 0) return { status: "insufficient_data", value: null, unit, reason: "No real KPI-eligible accounts exist in this denominator yet.", numerator, denominator };
  return { status: "available", value: Math.round((numerator / denominator) * 10_000) / 100, unit, numerator, denominator };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function durationMetric(key: "time_to_first_value" | "time_to_second_cycle", hours: number[]): PmfMetricResult {
  if (hours.length < MIN_DURATION_SAMPLE) {
    return {
      status: "insufficient_data",
      value: null,
      unit: "hours",
      reason: `Fewer than ${MIN_DURATION_SAMPLE} real KPI-eligible observations; aggregate median is intentionally withheld.`,
      sampleSize: hours.length,
    };
  }
  return { status: "available", value: Math.round(median(hours) * 100) / 100, unit: PMF_METRIC_DEFINITIONS[key].unit, sampleSize: hours.length };
}

function hasActivityBetween(account: PmfAccountFacts, start: number, end: number) {
  return account.activityAt.some((value) => {
    const at = timestamp(value);
    return at !== null && at >= start && at < end;
  });
}

function activated(account: PmfAccountFacts) {
  return Boolean(
    timestamp(account.firstMeasurementAt) !== null
    && timestamp(account.firstRecordReviewedAt) !== null
    && timestamp(account.firstActionCreatedAt) !== null
    && timestamp(account.firstActionAssignedAt) !== null,
  );
}

/**
 * Derives PMF metrics only from caller-supplied first-party account facts.
 * This function has no synthetic fallback and deliberately returns
 * `insufficient_data` when a denominator or evidence boundary does not exist.
 */
export function derivePmfMetrics(accounts: PmfAccountFacts[], now = new Date()): PmfMetrics {
  const eligible = accounts.filter((account) => account.includedInCompanyKpis);
  const nowMs = now.getTime();
  const current30Start = nowMs - 30 * DAY_MS;
  const prior30Start = nowMs - 60 * DAY_MS;
  const wauStart = nowMs - 7 * DAY_MS;

  const activatedAccounts = eligible.filter(activated);
  const firstMeasured = eligible.filter((account) => timestamp(account.firstMeasurementAt) !== null);
  const firstReviewed = eligible.filter((account) => timestamp(account.firstRecordReviewedAt) !== null);
  const actionCreated = eligible.filter((account) => timestamp(account.firstActionCreatedAt) !== null);
  const secondCycle = activatedAccounts.filter((account) => timestamp(account.secondComparableCycleAt) !== null);

  const current30 = eligible.filter((account) => hasActivityBetween(account, current30Start, nowMs + 1));
  const prior30 = eligible.filter((account) => hasActivityBetween(account, prior30Start, current30Start));
  const retained = prior30.filter((account) => hasActivityBetween(account, current30Start, nowMs + 1));
  const wau = eligible.filter((account) => hasActivityBetween(account, wauStart, nowMs + 1));

  const ttfvHours = eligible.flatMap((account) => {
    const created = timestamp(account.createdAt);
    const reviewed = timestamp(account.firstRecordReviewedAt);
    return created !== null && reviewed !== null && reviewed >= created ? [(reviewed - created) / 3_600_000] : [];
  });
  const secondCycleHours = eligible.flatMap((account) => {
    const first = timestamp(account.firstMeasurementAt);
    const second = timestamp(account.secondComparableCycleAt);
    return first !== null && second !== null && second >= first ? [(second - first) / 3_600_000] : [];
  });

  const designPartners = eligible.filter((account) => timestamp(account.designPartnerAcceptedAt) !== null);
  const convertedDesignPartners = designPartners.filter((account) => timestamp(account.payingStartedAt) !== null && account.billingVerified);
  const realBillingExists = eligible.some((account) => account.billingVerified);
  const paidActivated = activatedAccounts.filter((account) => account.billingVerified && timestamp(account.payingStartedAt) !== null);

  return {
    activation_rate: rate("activation_rate", activatedAccounts.length, eligible.length),
    first_record_review_rate: rate("first_record_review_rate", firstReviewed.length, firstMeasured.length),
    action_creation_rate: rate("action_creation_rate", actionCreated.length, firstReviewed.length),
    second_cycle_rate: rate("second_cycle_rate", secondCycle.length, activatedAccounts.length),
    wau_accounts: eligible.length ? availableCount(wau.length) : { status: "insufficient_data", value: null, unit: "accounts", reason: "No real KPI-eligible accounts exist yet.", sampleSize: 0 },
    mau_accounts: eligible.length ? availableCount(current30.length) : { status: "insufficient_data", value: null, unit: "accounts", reason: "No real KPI-eligible accounts exist yet.", sampleSize: 0 },
    retained_account_rate: rate("retained_account_rate", retained.length, prior30.length),
    time_to_first_value: durationMetric("time_to_first_value", ttfvHours),
    time_to_second_cycle: durationMetric("time_to_second_cycle", secondCycleHours),
    design_partner_conversion: rate("design_partner_conversion", convertedDesignPartners.length, designPartners.length),
    paid_conversion: realBillingExists
      ? rate("paid_conversion", paidActivated.length, activatedAccounts.length)
      : { status: "insufficient_data", value: null, unit: "percent", reason: "No verified real billing/payment evidence exists yet.", numerator: 0, denominator: activatedAccounts.length },
  };
}
