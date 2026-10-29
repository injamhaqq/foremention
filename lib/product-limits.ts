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
  buyerQuestions: 5,
  providersPerRun: 1,
  runUnitsPerMonth: 10,
  monthlyAiSpendCapUsd: 1,
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

/**
 * Paid package capacity (Refs #516). Mirrors /pricing and the database trigger
 * `billing_package_capacity_v1` (supabase/migrations/20261011090000_*), which is
 * the source of truth: capacity is written only by the verified billing
 * webhook path. Run units = questions x measurement cycles per month x 1 provider.
 */
/** One-time Core trial without a payment method (migration 20261014180000). */
export const CORE_TRIAL_DAYS = 7;
export const CORE_TRIAL_CAPACITY = { buyerQuestions: 25, runUnitsPerMonth: 50, providersPerRun: 2, monthlyAiSpendCapUsd: 5 } as const;

/** Trial state from an entitlement row; null when the row is not a live trial. */
export function coreTrialState(row: { billing_source?: string | null; status?: string | null; expires_at?: string | null } | null | undefined, now = new Date()) {
  if (!row || row.billing_source !== "trial" || row.status !== "active" || !row.expires_at) return null;
  const endsAt = new Date(row.expires_at);
  if (!Number.isFinite(endsAt.getTime()) || endsAt <= now) return null;
  return { endsAt: endsAt.toISOString(), daysLeft: Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)) };
}

/** A workspace can start the trial only if it never had one and is not on a paid plan. */
export function coreTrialAvailable(row: { billing_source?: string | null; status?: string | null; package_key?: string | null; expires_at?: string | null } | null | undefined, now = new Date()) {
  if (!row) return true;
  if (row.billing_source === "trial" || row.billing_source === "trial_expired") return false;
  const paidSource = row.billing_source === "paddle" || row.billing_source === "stripe" || row.billing_source === "creem";
  const unexpired = !row.expires_at || new Date(row.expires_at) > now;
  if (paidSource && row.status === "active" && unexpired && (row.package_key === "core" || row.package_key === "signal")) return false;
  return true;
}

export const PACKAGE_CAPACITY = {
  core: { buyerQuestions: 25, runUnitsPerMonth: 100, brands: 1 },
  signal: { buyerQuestions: 100, runUnitsPerMonth: 1000, brands: 3 },
} as const;

export type CapacityEntitlementRow = {
  status?: string | null;
  package_key?: string | null;
  billing_source?: string | null;
  expires_at?: string | null;
  max_prompts?: number | null;
};

const BILLING_PROVIDER_SOURCES = new Set(["stripe", "creem", "paddle"]);

/**
 * Customer-facing explanation when a workspace reaches its buyer-question
 * ceiling. A paying customer must never be told that "paid capacity is enabled
 * only after verified billing activation" — their capacity is already active;
 * what they need is the next step for their actual plan.
 */
export function buyerQuestionCeilingMessage(row: CapacityEntitlementRow | null | undefined, limit: number, now = new Date()): string {
  const active = row?.status === "active" && (!row.expires_at || new Date(row.expires_at) > now);
  const paid = active && Boolean(row?.billing_source && BILLING_PROVIDER_SOURCES.has(row.billing_source));
  if (paid && (row?.package_key === "core" || row?.package_key === "signal")) {
    const name = row.package_key === "signal" ? "Signal" : "Core";
    const nextStep = row.package_key === "core"
      ? "Upgrade to Signal for up to 100 buyer questions, or deactivate a question you no longer need."
      : "Deactivate a question you no longer need.";
    return `Your ${name} plan includes ${limit} buyer questions. ${nextStep}`;
  }
  if (active && row?.billing_source === "trial") {
    return `Your Core trial includes ${limit} buyer questions. Choose Core or Signal in Billing to keep this capacity.`;
  }
  return `The free plan allows ${limit} buyer questions. Start the 7-day Core trial or choose a plan in Billing to add more.`;
}

/**
 * Rewrites the raw run-quota refusal into accurate customer copy. The database
 * message says "Free beta limit reached: N of M provider-prompt observations",
 * which is wrong for a paying Core/Signal workspace that simply reached its
 * purchased monthly allowance. The counts are already the workspace's real
 * entitlement values, so only the framing is corrected.
 */
export function collectionCapacityMessage(rawMessage: string): string {
  const quota = rawMessage.match(/free beta limit reached:\s*(\d+)\s*of\s*(\d+)\s*provider-prompt observations/i);
  if (quota) {
    return `This workspace has used ${quota[1]} of ${quota[2]} provider-prompt observations this month. The allowance resets at the start of next month, or choose a higher plan in Settings → Billing.`;
  }
  return rawMessage;
}

/**
 * Server-side buyer-question ceiling for an organization. Fails closed to
 * Foundation access unless the entitlement is active, unexpired, and either a
 * verified-billing paid package or an explicit founder/manual grant. Never
 * exceeds the package ceiling for verified-billing rows.
 */
export function buyerQuestionLimit(row: CapacityEntitlementRow | null | undefined, now = new Date()): number {
  const foundation = FOUNDATION_ACCESS_LIMITS.buyerQuestions;
  if (!row || row.status !== "active") return foundation;
  if (row.expires_at) {
    const expiry = new Date(row.expires_at);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) return foundation;
  }
  const stored = typeof row.max_prompts === "number" && Number.isInteger(row.max_prompts) && row.max_prompts > 0
    ? row.max_prompts
    : foundation;
  if (row.billing_source && BILLING_PROVIDER_SOURCES.has(row.billing_source)) {
    const pkg = row.package_key === "core" || row.package_key === "signal" ? PACKAGE_CAPACITY[row.package_key] : null;
    return pkg ? Math.min(stored, pkg.buyerQuestions) : foundation;
  }
  return stored;
}

export type AutoScheduleEntitlement = {
  status?: string | null;
  package_key?: string | null;
  billing_source?: string | null;
  expires_at?: string | null;
};

/**
 * Cadence a paid or trial workspace gets automatically after its first
 * collection, matching what /pricing sells: Signal and the 7-day Core trial
 * weekly (so a trial sees a second comparable cycle), paid Core monthly.
 * Free workspaces keep recurring measurement opt-in (null).
 */
export function autoScheduleCadence(row: AutoScheduleEntitlement | null | undefined, now = new Date()): "weekly" | "monthly" | null {
  if (!row || row.status !== "active") return null;
  if (row.expires_at) {
    const expiry = new Date(row.expires_at);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) return null;
  }
  if (row.package_key === "signal") return "weekly";
  if (row.package_key !== "core") return null;
  if (row.billing_source === "trial") return "weekly";
  return ["paddle", "stripe", "creem"].includes(row.billing_source || "") ? "monthly" : null;
}
