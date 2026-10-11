/**
 * Foundation access limits.
 *
 * Defaults allow a weekly pilot cycle: 10 buyer questions x 1 provider x up to
 * 5 scheduled weeks in a calendar month = 50 provider-prompt observations.
 * The monthly AI spend cap is NOT raised: it stays at $2 unless an operator
 * explicitly sets FOREMENTION_FOUNDATION_MONTHLY_AI_SPEND_CAP_USD. The
 * per-organization quota and budget are still enforced fail-closed by the
 * `reserve_run_quota_server` / `reserve_run_budget_server` RPCs, so a
 * higher-cost provider stops at the dollar cap even when observation units remain.
 *
 * Every override is bounded; an invalid or out-of-range value falls back to the
 * default rather than silently widening a limit.
 */
export const FOUNDATION_ACCESS_DEFAULTS = {
  plan: "Foundation access",
  brands: 1,
  buyerQuestions: 10,
  providersPerRun: 1,
  runUnitsPerMonth: 50,
  monthlyAiSpendCapUsd: 2,
  historyDays: 90,
  teamMembers: 1,
} as const;

export const WEEKLY_PILOT_MAX_RUNS_PER_MONTH = 5;

type LimitEnv = Record<string, string | undefined>;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function boundedUsd(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return fallback;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function foundationAccessLimits(env: LimitEnv = process.env) {
  const defaults = FOUNDATION_ACCESS_DEFAULTS;
  return {
    plan: defaults.plan,
    brands: defaults.brands,
    buyerQuestions: boundedInteger(env.FOREMENTION_FOUNDATION_BUYER_QUESTIONS, defaults.buyerQuestions, 1, 100),
    providersPerRun: defaults.providersPerRun,
    runUnitsPerMonth: boundedInteger(env.FOREMENTION_FOUNDATION_RUN_UNITS_PER_MONTH, defaults.runUnitsPerMonth, 1, 100_000),
    monthlyAiSpendCapUsd: boundedUsd(env.FOREMENTION_FOUNDATION_MONTHLY_AI_SPEND_CAP_USD, defaults.monthlyAiSpendCapUsd, 0, 100_000),
    historyDays: boundedInteger(env.FOREMENTION_FOUNDATION_HISTORY_DAYS, defaults.historyDays, 1, 3650),
    teamMembers: defaults.teamMembers,
  };
}

/** Whether a weekly cadence over the full question set fits the monthly observation units. */
export function weeklyPilotFits(limits: { buyerQuestions: number; providersPerRun: number; runUnitsPerMonth: number }) {
  return limits.buyerQuestions * limits.providersPerRun * WEEKLY_PILOT_MAX_RUNS_PER_MONTH <= limits.runUnitsPerMonth;
}

export const FOUNDATION_ACCESS_LIMITS = foundationAccessLimits();

export type ProductPlan = "foundation_access";

export function runUnits(promptCount: number, providerCount: number) {
  return Math.max(0, Math.trunc(promptCount)) * Math.max(0, Math.trunc(providerCount));
}

export function foundationAccessSummary() {
  return `${FOUNDATION_ACCESS_LIMITS.buyerQuestions} buyer questions, ${FOUNDATION_ACCESS_LIMITS.runUnitsPerMonth} provider-prompt observations per month, and ${FOUNDATION_ACCESS_LIMITS.historyDays} days of history.`;
}
