import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCommercialProofEvent, summarizeCommercialProof, fourWeekPilotScenario,
} from "../lib/commercial-proof-economics.mjs";

const asOf = "2026-10-12T15:00:00.000Z";
const authority = {
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
};
function fact(kind, day, extra = {}) {
  return {
    kind, eventId: "event-" + kind + "-01", organizationId: "external-tenant-01",
    evidenceRef: "source-" + kind + "-01", accountKind: "external_customer",
    authority: authority[kind], confirmation: "verified",
    occurredAt: "2026-10-" + String(day).padStart(2, "0") + "T00:00:00.000Z",
    ...extra,
  };
}

test("research/founder/test records and wrong payment authority do not count", () => {
  assert.equal(evaluateCommercialProofEvent(fact("interview_completed", 4, {
    accountKind: "research_only", participantConfirmed: true,
  }), asOf).eligible, false);
  assert.equal(evaluateCommercialProofEvent(fact("payment_settled", 4, {
    authority: "commercial_ledger", amountCents: 29900, settlementRef: "receipt-12345",
  }), asOf).reason, "wrong_authority");
  assert.equal(evaluateCommercialProofEvent(fact("payment_settled", 20, {
    amountCents: 29900, settlementRef: "receipt-12345",
  }), asOf).reason, "missing_or_future_date");
  assert.equal(evaluateCommercialProofEvent(fact("interview_completed", 4, {
    participantConfirmed: false,
  }), asOf).reason, "interview_not_confirmed");
});

test("reviewed Change Specification and a later comparable cycle required", () => {
  const records = [
    fact("design_partner_accepted", 1),
    fact("first_record_reviewed", 3),
    fact("change_specification_approved", 4),
    fact("comparable_second_cycle_reviewed", 9, { comparable: true }),
    fact("payment_settled", 8, { amountCents: 29900,
      settlementRef: "settlement-real-001", pilotScopeRef: "pilot-approved-001" }),
    fact("refund_settled", 10, { amountCents: 9900, settlementRef: "settlement-refund-01" }),
  ];
  const r = summarizeCommercialProof([...records, records[4],
    fact("interview_completed", 5, { accountKind: "test", participantConfirmed: true })], asOf);
  assert.equal(r.activatedDesignPartners, 1);
  assert.equal(r.comparableSecondCycleOrgs, 1);
  assert.equal(r.paidPilotOrgs, 1);
  assert.equal(r.netCollectedCashCents, 20000);
  assert.equal(r.mrrCents, null);
  assert.equal(r.exclusions.length, 2);
});

test("incomparable/early second cycle and one-off payment do not create retention or MRR", () => {
  const r = summarizeCommercialProof([
    fact("design_partner_accepted", 1),
    fact("comparable_second_cycle_reviewed", 2, { comparable: true }),
    fact("first_record_reviewed", 4),
    fact("change_specification_approved", 5),
    fact("payment_settled", 7, { amountCents: 3000, settlementRef: "real-settlement-001" }),
  ], asOf);
  assert.equal(r.comparableSecondCycleOrgs, 0);
  assert.equal(r.paidPilotOrgs, 0);
  assert.equal(r.netCollectedCashCents, 3000);
  assert.equal(r.mrrCents, null);
});

const inputs = { priceUsd: 299, setupHours: 2, reviewHours: 3, supportHours: 1,
  hourlyCostUsd: 25, providerCostUsd: 12, fixedInfraUsd: 100,
  sellingHours: 2, acquisitionCashUsd: 20, feeRate: 0.05,
  flatFeeUsd: 0.50, refundReserveRate: 0.01, collectionFraction: 1,
  pilotCallLimit: 60, plannedCalls: 50 };

test("1/5/20 stress snapshots account for founder time and direct margin", () => {
  for (const clients of [1,5,20]) {
    const r = fourWeekPilotScenario({ ...inputs, clients });
    assert.equal(r.founderHours, clients * 8);
    assert.ok(Math.abs(r.deliveryContributionUsd - clients * 118.56) < 0.00001);
    assert.ok(Math.abs(r.afterAcquisitionAndFixedUsd - (clients * 48.56 - 100)) < 0.00001);
    assert.equal(r.overPilotCallLimit, false);
    assert.equal(r.freeCallBoundary, "disabled");
    assert.equal(r.evidenceType, "scenario_not_receipt");
  }
});
test("invalid and uncollected scenarios fail closed", () => {
  assert.throws(() => fourWeekPilotScenario({ ...inputs, clients: 1, priceUsd: null }), /bounded number/);
  assert.throws(() => fourWeekPilotScenario({ ...inputs, clients: 1, feeRate: -0.1 }), /bounded number/);
  assert.equal(fourWeekPilotScenario({ ...inputs, clients: 1, collectionFraction: 0 }).deliveryMargin, null);
  assert.equal(fourWeekPilotScenario({ ...inputs, clients: 1, plannedCalls: 61 }).overPilotCallLimit, true);
});
