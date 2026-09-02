export const CROSS_BUSINESS_EVIDENCE_TYPES = [
  "sales_win_loss",
  "customer_interview",
  "support",
  "product_analytics",
  "feature_request",
  "churn_retention",
  "review",
  "pricing_commercial",
  "customer_success",
  "revenue",
] as const;

export const CROSS_BUSINESS_DIRECTIONS = ["supports", "contradicts", "context", "unknown"] as const;

export type CrossBusinessEvidenceType = (typeof CROSS_BUSINESS_EVIDENCE_TYPES)[number];
export type CrossBusinessDirection = (typeof CROSS_BUSINESS_DIRECTIONS)[number];

export type CommercialEvidenceInput = {
  kind: "event" | "opportunity";
  id: string;
  eventType?: string | null;
  occurredAt?: string | null;
  stage?: string | null;
  commercialModel?: string | null;
  currency?: string | null;
  acceptedValueUsd?: number | null;
  paidValueUsd?: number | null;
  mrrUsd?: number | null;
  arrUsd?: number | null;
  revenueSource?: string | null;
  closedAt?: string | null;
};

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function bounded(value: unknown, max = 80) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export function sanitizeCommercialEvidenceSnapshot(input: CommercialEvidenceInput): Record<string, unknown> {
  if (input.kind === "event") {
    return {
      kind: "commercial_event",
      eventId: input.id,
      eventType: bounded(input.eventType),
      occurredAt: bounded(input.occurredAt, 40),
    };
  }

  return Object.fromEntries(Object.entries({
    kind: "commercial_opportunity",
    opportunityId: input.id,
    stage: bounded(input.stage),
    commercialModel: bounded(input.commercialModel),
    currency: bounded(input.currency, 3),
    acceptedValueUsd: finiteNonNegative(input.acceptedValueUsd),
    paidValueUsd: finiteNonNegative(input.paidValueUsd),
    mrrUsd: finiteNonNegative(input.mrrUsd),
    arrUsd: finiteNonNegative(input.arrUsd),
    revenueSource: bounded(input.revenueSource),
    closedAt: bounded(input.closedAt, 40),
  }).filter(([, value]) => value !== null));
}
