export const FREE_BETA_LIMITS = {
  plan: "Free beta",
  brands: 1,
  buyerQuestions: 10,
  runUnitsPerMonth: 20,
  historyDays: 90,
  teamMembers: 1,
} as const;

export type ProductPlan = "free_beta";

export function runUnits(promptCount: number, providerCount: number) {
  return Math.max(0, Math.trunc(promptCount)) * Math.max(0, Math.trunc(providerCount));
}

export function freeBetaSummary() {
  return `${FREE_BETA_LIMITS.buyerQuestions} buyer questions, ${FREE_BETA_LIMITS.runUnitsPerMonth} provider-prompt observations per month, and ${FREE_BETA_LIMITS.historyDays} days of history.`;
}
