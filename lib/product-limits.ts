export const FOUNDATION_ACCESS_LIMITS = {
  plan: "Foundation access",
  brands: 1,
  buyerQuestions: 10,
  runUnitsPerMonth: 20,
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
