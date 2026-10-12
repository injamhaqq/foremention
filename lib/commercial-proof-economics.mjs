/**
 * Read-only Chat08 proposal helpers. Input facts MUST come from their canonical
 * event owners; nothing here ingests production data, changes a paid entitlement,
 * recognizes GAAP revenue or turns a model scenario into an invoice/receipt.
 */
export const EVENT_AUTHORITY = Object.freeze({
  design_partner_accepted: "commercial_ledger",
  interview_completed: "research_interview",
  scoped_offer_delivered: "commercial_ledger",
  first_record_reviewed: "recommendation_record",
  change_specification_approved: "change_specification",
  comparable_second_cycle_reviewed: "comparison_record",
  pilot_commitment_signed: "executed_agreement",
  payment_settled: "billing_ledger",
  refund_settled: "billing_ledger",
  renewal_payment_settled: "billing_ledger",
  case_study_consent_granted: "signed_consent",
});

const paymentKinds = new Set(["payment_settled", "refund_settled", "renewal_payment_settled"]);
const dateMs = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : null;
const present = value => typeof value === "string" && value.trim().length >= 8;

/** No founder/test/research record, unverified claim, or future date is counted. */
export function evaluateCommercialProofEvent(event, asOfIso) {
  if (dateMs(asOfIso) === null) throw new TypeError("Expected exact UTC ISO asOfIso");
  if (!event || typeof event !== "object" || Array.isArray(event)) return { eligible: false, reason: "invalid_event" };
  if (!Object.hasOwn(EVENT_AUTHORITY, event.kind)) return { eligible: false, reason: "unknown_event_kind" };
  if (event.accountKind !== "external_customer") return { eligible: false, reason: "not_external_customer" };
  if (event.confirmation !== "verified") return { eligible: false, reason: "unverified_claim" };
  if (event.authority !== EVENT_AUTHORITY[event.kind]) return { eligible: false, reason: "wrong_authority" };
  if (![event.organizationId, event.evidenceRef, event.eventId].every(present))
    return { eligible: false, reason: "missing_authoritative_reference" };
  if (dateMs(event.occurredAt) === null || dateMs(event.occurredAt) > dateMs(asOfIso))
    return { eligible: false, reason: "missing_or_future_date" };
  if (paymentKinds.has(event.kind) &&
    (!Number.isSafeInteger(event.amountCents) || event.amountCents <= 0 ||
     event.amountCents > 100_000_000_000 || !present(event.settlementRef)))
    return { eligible: false, reason: "missing_valid_settlement" };
  if (event.kind === "interview_completed" && event.participantConfirmed !== true)
    return { eligible: false, reason: "interview_not_confirmed" };
  if (event.kind === "comparable_second_cycle_reviewed" && event.comparable !== true)
    return { eligible: false, reason: "not_comparable" };
  return { eligible: true, reason: "verified_external_fact" };
}

/** Counts distinct external accounts, confirmed interviews, and reconciled cash separately. */
export function summarizeCommercialProof(events, asOfIso) {
  if (!Array.isArray(events)) throw new TypeError("Expected event array");
  const grouped = new Map(), seen = new Set(), exclusions = [];
  for (const event of events) {
    const eligible = evaluateCommercialProofEvent(event, asOfIso);
    if (!eligible.eligible) {
      exclusions.push({ eventId: event?.eventId ?? null, reason: eligible.reason });
      continue;
    }
    const key = event.authority + "\u0000" + event.eventId;
    if (seen.has(key)) { exclusions.push({ eventId: event.eventId, reason: "duplicate_event" }); continue; }
    seen.add(key);
    if (!grouped.has(event.organizationId)) grouped.set(event.organizationId, []);
    grouped.get(event.organizationId).push(event);
  }
  const has = (g, kind) => g.some(e => e.kind === kind);
  let acceptedDesignPartners = 0, activatedDesignPartners = 0, comparableSecondCycleOrgs = 0;
  let paidOrSignedPilotOrgs = 0, paidPilotOrgs = 0, interviewCount = 0, scopedOffers = 0;
  let settledCashCents = 0, refundedCashCents = 0;
  for (const group of grouped.values()) {
    const first = kind => Math.min(...group.filter(e => e.kind === kind).map(e => dateMs(e.occurredAt)));
    const accepted = first("design_partner_accepted");
    const baseline = first("first_record_reviewed");
    const approved = first("change_specification_approved");
    const activated = Number.isFinite(accepted) && Number.isFinite(baseline) &&
      Number.isFinite(approved) && accepted <= baseline && baseline <= approved;
    if (Number.isFinite(accepted)) acceptedDesignPartners++;
    if (activated) activatedDesignPartners++;
    if (activated && group.some(e => e.kind === "comparable_second_cycle_reviewed" && dateMs(e.occurredAt) > approved))
      comparableSecondCycleOrgs++;
    const paidPilot = group.some(e => (e.kind === "payment_settled" || e.kind === "renewal_payment_settled") && present(e.pilotScopeRef));
    if (paidPilot) paidPilotOrgs++;
    if (paidPilot || group.some(e => e.kind === "pilot_commitment_signed" && present(e.pilotScopeRef))) paidOrSignedPilotOrgs++;
    interviewCount += group.filter(e => e.kind === "interview_completed").length;
    if (has(group, "scoped_offer_delivered")) scopedOffers++;
    settledCashCents += group.filter(e => e.kind === "payment_settled" || e.kind === "renewal_payment_settled")
      .reduce((total, e) => total + e.amountCents, 0);
    refundedCashCents += group.filter(e => e.kind === "refund_settled")
      .reduce((total, e) => total + e.amountCents, 0);
  }
  return Object.freeze({
    externalOrganizationsWithEvidence: grouped.size, acceptedDesignPartners,
    activatedDesignPartners, comparableSecondCycleOrgs, paidOrSignedPilotOrgs,
    paidPilotOrgs, interviewCount, scopedOffers,
    settledCashCents, refundedCashCents,
    netCollectedCashCents: settledCashCents - refundedCashCents,
    mrrCents: null, arrCents: null, // requires authoritative recurring billing and service period
    verifiedEventCount: seen.size, exclusions,
  });
}

const positive = (v, k, max = 1e9) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
    throw new TypeError(k + " must be a finite nonnegative bounded number");
  return v;
};

/** Four-week unit economics: an explicit planning scenario, NEVER first-party earnings. */
export function fourWeekPilotScenario({
  clients, priceUsd, shareNew = 1, setupHours, reviewHours, supportHours,
  hourlyCostUsd, providerCostUsd, fixedInfraUsd, sellingHours = 0,
  acquisitionCashUsd = 0, feeRate = 0, flatFeeUsd = 0, refundReserveRate = 0,
  collectionFraction = 1, pilotCallLimit, plannedCalls, freeProviderCalls = 0,
}) {
  if (!Number.isSafeInteger(clients) || clients < 0 || clients > 100000)
    throw new TypeError("clients must be nonnegative integer");
  for (const [k, v] of Object.entries({priceUsd, shareNew, setupHours, reviewHours,
    supportHours, hourlyCostUsd, providerCostUsd, fixedInfraUsd, sellingHours,
    acquisitionCashUsd, feeRate, flatFeeUsd, refundReserveRate, collectionFraction}))
    positive(v, k, ["feeRate", "refundReserveRate", "shareNew", "collectionFraction"].includes(k) ? 1 : 1e9);
  for (const [k,v] of Object.entries({pilotCallLimit,plannedCalls,freeProviderCalls}))
    if (!Number.isSafeInteger(v) || v < 0) throw new TypeError(k + " must be nonnegative integer");
  const newClients = clients * shareNew;
  const serviceHours = clients * (reviewHours + supportHours) + newClients * setupHours;
  const salesHours = newClients * sellingHours;
  const contractedUsd = clients * priceUsd;
  const expectedCollectedUsd = contractedUsd * collectionFraction;
  const processingUsd = expectedCollectedUsd * feeRate + clients * collectionFraction * flatFeeUsd;
  const refundReserveUsd = expectedCollectedUsd * refundReserveRate;
  const deliveryContributionUsd = expectedCollectedUsd - processingUsd - refundReserveUsd
    - clients * providerCostUsd - serviceHours * hourlyCostUsd;
  const acquisitionUsd = newClients * acquisitionCashUsd + salesHours * hourlyCostUsd;
  return Object.freeze({clients, contractedUsd, expectedCollectedUsd,
    serviceHours, salesHours, founderHours: serviceHours + salesHours,
    processingUsd, refundReserveUsd, providerUsd: clients * providerCostUsd,
    deliveryLaborUsd: serviceHours * hourlyCostUsd, deliveryContributionUsd,
    deliveryMargin: expectedCollectedUsd ? deliveryContributionUsd / expectedCollectedUsd : null,
    acquisitionUsd, fixedInfraUsd, afterAcquisitionAndFixedUsd:
      deliveryContributionUsd - acquisitionUsd - fixedInfraUsd,
    overPilotCallLimit: plannedCalls > pilotCallLimit,
    freeCallBoundary: freeProviderCalls === 0 ? "disabled" : "capped_hypothesis",
    evidenceType: "scenario_not_receipt",
  });
}
