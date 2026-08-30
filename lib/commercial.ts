export const COMMERCIAL_STAGES = [
  "identified",
  "discovery",
  "qualified",
  "demo",
  "pilot_proposed",
  "pilot_active",
  "proposal",
  "security_review",
  "procurement",
  "negotiation",
  "won",
  "lost",
] as const;

export type CommercialStage = (typeof COMMERCIAL_STAGES)[number];

export const COMMERCIAL_OPPORTUNITY_TYPES = ["new_business", "design_partner", "renewal", "expansion"] as const;
export type CommercialOpportunityType = (typeof COMMERCIAL_OPPORTUNITY_TYPES)[number];

export const PRICING_EVIDENCE_STATES = ["current_fact", "experiment", "hypothesis", "future_target"] as const;
export type PricingEvidenceState = (typeof PRICING_EVIDENCE_STATES)[number];

export const PRICING_RESEARCH_DIMENSIONS = [
  "willingness_to_pay",
  "value_metric",
  "package_boundary",
  "question_limit",
  "brand_workspace_limit",
  "measurement_frequency",
  "users",
  "integrations",
  "api",
  "enterprise_controls",
  "minimum_acv",
  "annual_contract",
  "overage",
  "gross_margin",
] as const;
export type PricingResearchDimension = (typeof PRICING_RESEARCH_DIMENSIONS)[number];

const STAGE_ORDER = new Map(COMMERCIAL_STAGES.map((stage, index) => [stage, index]));
const CLOSED_STAGES = new Set<CommercialStage>(["won", "lost"]);

export function canTransitionCommercialStage(current: CommercialStage, next: CommercialStage) {
  if (current === next) return true;
  if (CLOSED_STAGES.has(current)) return false;
  if (next === "lost") return true;
  if (next === "won") return ["pilot_active", "proposal", "security_review", "procurement", "negotiation"].includes(current);
  return (STAGE_ORDER.get(next) || 0) >= (STAGE_ORDER.get(current) || 0);
}

export type CommercialMetricInput = {
  leadCount?: number | null;
  qualifiedOpportunityCount?: number | null;
  demoCount?: number | null;
  designPartnerCount?: number | null;
  wonCount?: number | null;
  lostCount?: number | null;
  wonAcvCents?: number[] | null;
  salesCycleDays?: number[] | null;
  salesAndMarketingSpendCents?: number | null;
  newCustomerAnnualGrossProfitCents?: number | null;
  revenueCents?: number | null;
  serviceCogsCents?: number | null;
  startingMrrCents?: number | null;
  newMrrCents?: number | null;
  expansionMrrCents?: number | null;
  contractionMrrCents?: number | null;
  churnedMrrCents?: number | null;
};

export type CommercialMetrics = {
  leads: number | null;
  qualifiedOpportunities: number | null;
  demos: number | null;
  designPartners: number | null;
  won: number | null;
  lost: number | null;
  qualifiedToWonConversion: number | null;
  winRate: number | null;
  acvCents: number | null;
  salesCycleDays: number | null;
  cacCents: number | null;
  paybackMonths: number | null;
  grossMargin: number | null;
  expansionMrrCents: number | null;
  churnedMrrCents: number | null;
  grr: number | null;
  nrr: number | null;
};

function finiteNonNegative(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function average(values: number[] | null | undefined) {
  if (!values?.length) return null;
  const clean = values.filter((value) => Number.isFinite(value) && value >= 0);
  return clean.length === values.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

function safeRate(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return numerator / denominator;
}

export function computeCommercialMetrics(input: CommercialMetricInput): CommercialMetrics {
  const leads = finiteNonNegative(input.leadCount);
  const qualified = finiteNonNegative(input.qualifiedOpportunityCount);
  const demos = finiteNonNegative(input.demoCount);
  const designPartners = finiteNonNegative(input.designPartnerCount);
  const won = finiteNonNegative(input.wonCount);
  const lost = finiteNonNegative(input.lostCount);
  const salesSpend = finiteNonNegative(input.salesAndMarketingSpendCents);
  const annualGrossProfit = finiteNonNegative(input.newCustomerAnnualGrossProfitCents);
  const revenue = finiteNonNegative(input.revenueCents);
  const cogs = finiteNonNegative(input.serviceCogsCents);
  const startingMrr = finiteNonNegative(input.startingMrrCents);
  const expansionMrr = finiteNonNegative(input.expansionMrrCents);
  const contractionMrr = finiteNonNegative(input.contractionMrrCents);
  const churnedMrr = finiteNonNegative(input.churnedMrrCents);
  const acvCents = average(input.wonAcvCents);
  const cycleDays = average(input.salesCycleDays);
  const cacCents = won && salesSpend !== null ? salesSpend / won : null;

  let paybackMonths: number | null = null;
  if (cacCents !== null && won && annualGrossProfit !== null && annualGrossProfit > 0) {
    const monthlyGrossProfitPerNewCustomer = annualGrossProfit / won / 12;
    if (monthlyGrossProfitPerNewCustomer > 0) paybackMonths = cacCents / monthlyGrossProfitPerNewCustomer;
  }

  const grossMargin = revenue !== null && revenue > 0 && cogs !== null ? (revenue - cogs) / revenue : null;
  const grr = startingMrr !== null && startingMrr > 0 && contractionMrr !== null && churnedMrr !== null
    ? Math.max(0, startingMrr - contractionMrr - churnedMrr) / startingMrr
    : null;
  const nrr = startingMrr !== null && startingMrr > 0 && expansionMrr !== null && contractionMrr !== null && churnedMrr !== null
    ? Math.max(0, startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr
    : null;

  return {
    leads,
    qualifiedOpportunities: qualified,
    demos,
    designPartners,
    won,
    lost,
    qualifiedToWonConversion: safeRate(won, qualified),
    winRate: won !== null && lost !== null ? safeRate(won, won + lost) : null,
    acvCents,
    salesCycleDays: cycleDays,
    cacCents,
    paybackMonths,
    grossMargin,
    expansionMrrCents: expansionMrr,
    churnedMrrCents: churnedMrr,
    grr,
    nrr,
  };
}
