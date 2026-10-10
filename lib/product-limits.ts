export const FOUNDATION_ACCESS_LIMITS = {
  plan: "Foundation access",
  brands: 1,
  buyerQuestions: 10,
  providersPerRun: 1,
  runUnitsPerMonth: 20,
  monthlyAiSpendCapUsd: 2,
  historyDays: 90,
  teamMembers: 1,
} as const;

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
export const PACKAGE_CAPACITY = {
  core: { buyerQuestions: 25, runUnitsPerMonth: 25, brands: 1 },
  signal: { buyerQuestions: 100, runUnitsPerMonth: 500, brands: 3 },
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
