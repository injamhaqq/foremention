import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { summarizeCommercialProof, fourWeekPilotScenario } from "../lib/commercial-proof-economics.mjs";
import {
  EXISTING_COMMERCIAL_EVENT_MAP, mapExistingCommercialEvent, summarizeServiceTime,
  evaluateProofGates, cohortScenario, classifyInvestorClaim,
} from "../lib/commercial-operations.mjs";

const iso = (day, month = 10) => new Date(Date.UTC(2026, month - 1, day)).toISOString();
const kpi = { classification: "design_partner", included_in_company_kpis: true };

/* -------- existing schema connection -------- */

test("event map covers exactly the current commercial_events check constraint", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  let latest = null;
  for (const f of files) {
    const sql = readFileSync(new URL(f, dir), "utf8");
    const m = sql.match(/add constraint commercial_event_type_check\s+check\s*\(event_type in \(([\s\S]*?)\)\)/);
    if (m) latest = m[1];
  }
  assert.ok(latest, "constraint found in migrations");
  const allowed = [...latest.matchAll(/'([a-z_]+)'/g)].map(x => x[1]).sort();
  assert.deepEqual(Object.keys(EXISTING_COMMERCIAL_EVENT_MAP).sort(), allowed);
});

test("existing rows become unverified candidates only for KPI-eligible orgs", () => {
  const row = { id: "evt-00000001", event_type: "payment_verified", source_system: "paddle",
    external_reference: "txn_01abcdefgh", occurred_at: iso(5), customer_organization_id: "org-external-1",
    settlementRef: "txn_01abcdefgh", amountCents: 29900 };
  const ok = mapExistingCommercialEvent(row, kpi);
  assert.equal(ok.candidate.kind, "payment_settled");
  assert.equal(ok.candidate.confirmation, "unverified");
  assert.deepEqual(ok.missingFields, []);
  // unverified candidates are never counted as proof until the owner verifies them
  assert.equal(summarizeCommercialProof([ok.candidate], iso(12)).settledCashCents, 0);

  assert.equal(mapExistingCommercialEvent({ ...row, source_system: "manual" }, kpi).reason,
    "manual_payment_not_billing_ledger");
  assert.equal(mapExistingCommercialEvent(row, { classification: "internal", included_in_company_kpis: false }).reason,
    "organization_not_kpi_eligible");
  assert.equal(mapExistingCommercialEvent(row, null).reason, "organization_not_kpi_eligible");
  assert.equal(mapExistingCommercialEvent({ ...row, event_type: "demo_held" }, kpi).reason, "demo_is_not_sale_or_value");
  assert.equal(mapExistingCommercialEvent({ ...row, event_type: "pilot_started" }, kpi).reason, "ambiguous_requires_owner_event");
  const interview = mapExistingCommercialEvent({ ...row, event_type: "customer_interview", source_system: "manual" }, kpi);
  assert.deepEqual(interview.missingFields, ["participantConfirmed"]);
  assert.equal(mapExistingCommercialEvent({ ...row, event_type: "lost_deal_recorded" }, kpi).candidate.outcome, "lost");
});

/* -------- service time -------- */

const window = { windowStartIso: iso(1), windowEndIso: iso(29), asOfIso: iso(29), hourlyCostUsd: 25 };
const entry = (id, org, category, minutes, day, accountKind = "external_customer") =>
  ({ entryId: "entry-" + id + "-000", organizationId: org, accountKind, category, minutes, occurredAt: iso(day) });

test("service time separates acquisition/setup/recurring and flags >4h recurring", () => {
  const r = summarizeServiceTime([
    entry(1, "org-a-000001", "acquisition", 120, 2),
    entry(2, "org-a-000001", "onboarding_setup", 120, 3),
    entry(3, "org-a-000001", "evidence_review", 180, 10),
    entry(4, "org-b-000001", "evidence_review", 200, 10),
    entry(5, "org-b-000001", "support", 100, 11),
    entry(6, "founder-org-1", "support", 60, 11, "internal"),
    entry(6, "org-b-000001", "support", 60, 12), // duplicate id
    entry(7, "org-b-000001", "support", 60, 30), // future/outside
    entry(8, "org-b-000001", "magic", 60, 12),
  ], window);
  const a = r.perAccount.find(x => x.organizationId === "org-a-000001");
  const b = r.perAccount.find(x => x.organizationId === "org-b-000001");
  assert.equal(a.recurringHours, 3);
  assert.equal(a.setupHours, 2);
  assert.equal(a.withinRecurringTarget, true);
  assert.equal(b.recurringHours, 5);
  assert.equal(b.withinRecurringTarget, false);
  assert.deepEqual(r.accountsOverRecurringTarget, ["org-b-000001"]);
  assert.equal(r.internalHours, 1);
  assert.equal(r.founderHours, 13);
  assert.equal(r.founderLaborCostUsd, 325);
  assert.deepEqual(r.exclusions.map(e => e.reason).sort(),
    ["missing_or_duplicate_entry_id", "missing_or_future_date", "unknown_category"]);
});

/* -------- gates -------- */

function verified(kind, org, day, extra = {}) {
  const authority = { design_partner_accepted: "commercial_ledger", interview_completed: "research_interview",
    scoped_offer_delivered: "commercial_ledger", first_record_reviewed: "recommendation_record",
    change_specification_approved: "change_specification", comparable_second_cycle_reviewed: "comparison_record",
    payment_settled: "billing_ledger", renewal_payment_settled: "billing_ledger",
    continuation_decision_recorded: "commercial_ledger", case_study_consent_granted: "signed_consent",
    pilot_commitment_signed: "executed_agreement" }[kind];
  return { kind, organizationId: org, eventId: `ev-${kind}-${org}-${day}`, evidenceRef: "evidence-ref-" + day,
    accountKind: "external_customer", authority, confirmation: "verified", occurredAt: iso(day, extra.month ?? 10), ...extra };
}

test("gates are not_due before their day and never pass on empty evidence", () => {
  const empty = summarizeCommercialProof([], iso(13));
  const early = evaluateProofGates(empty, null, { cohortStartIso: iso(1), asOfIso: iso(13) });
  assert.ok(early.gates.every(g => g.status === "not_due"));
  const late = evaluateProofGates(summarizeCommercialProof([], iso(31, 12)), null,
    { cohortStartIso: iso(1), asOfIso: iso(31, 12), qualifiedProspects: 0 });
  assert.equal(late.gates[0].status, "not_met");
  assert.equal(late.gates[2].status, "not_met");
  assert.equal(late.gates[2].criteria[1].status, "unavailable"); // no service log, no activated denominator
  const noProspectLedger = evaluateProofGates(summarizeCommercialProof([], iso(31, 12)), null,
    { cohortStartIso: iso(1), asOfIso: iso(31, 12) });
  assert.equal(noProspectLedger.gates[0].criteria[0].status, "unavailable");
  assert.equal(late.gates[3].status, "not_met");
  assert.equal(late.mrrCents, null);
});

test("elapsed renewal requires renewal after the paid service period ends", () => {
  const base = org => [
    verified("payment_settled", org, 2, { amountCents: 29900, settlementRef: "txn-initial-" + org,
      pilotScopeRef: "scope-0000001", servicePeriodEnd: iso(30) }),
  ];
  const early = summarizeCommercialProof([...base("org-x-000001"),
    verified("renewal_payment_settled", "org-x-000001", 20, { amountCents: 29900, settlementRef: "txn-renew-early" })], iso(28, 11));
  assert.equal(early.elapsedRenewalOrgs, 0);
  const elapsed = summarizeCommercialProof([...base("org-y-000001"),
    verified("renewal_payment_settled", "org-y-000001", 30, { amountCents: 29900, settlementRef: "txn-renew-ontime" })], iso(28, 11));
  assert.equal(elapsed.elapsedRenewalOrgs, 1);
});

test("full verified cohort meets gates; urgent-spend interviews and continuation counted", () => {
  const events = [];
  for (let i = 0; i < 8; i++) events.push(verified("interview_completed", "org-int-0000" + i, 5,
    { participantConfirmed: true, urgentJob: i < 5, currentSpendDocumented: i < 5 }));
  const partners = ["org-p-000001", "org-p-000002", "org-p-000003"];
  for (const org of partners) {
    events.push(verified("scoped_offer_delivered", org, 15), verified("design_partner_accepted", org, 16),
      verified("first_record_reviewed", org, 18), verified("change_specification_approved", org, 20),
      verified("comparable_second_cycle_reviewed", org, 20, { month: 11, comparable: true }),
      verified("payment_settled", org, 21, { amountCents: 29900, settlementRef: "txn-" + org, pilotScopeRef: "scope-" + org,
        servicePeriodEnd: iso(18, 11) }),
      verified("renewal_payment_settled", org, 18, { month: 11, amountCents: 29900, settlementRef: "txn-r-" + org }),
      verified("continuation_decision_recorded", org, 19, { month: 11, outcome: "renew" }));
  }
  for (let i = 0; i < 2; i++) events.push(verified("scoped_offer_delivered", "org-o-00000" + i, 15),
    verified("continuation_decision_recorded", "org-o-00000" + i, 25, { outcome: "lost" }));
  events.push(verified("continuation_decision_recorded", "org-bad-0001", 25, { outcome: "auto_renew" }));
  const asOf = iso(1, 1).replace("2026", "2027");
  const proof = summarizeCommercialProof(events, asOf);
  assert.equal(proof.interviewsWithUrgentSpend, 5);
  assert.equal(proof.scopedOffers, 5);
  assert.equal(proof.activatedDesignPartners, 3);
  assert.equal(proof.elapsedRenewalOrgs, 3);
  assert.equal(proof.cancelledOrLostOrgs, 2);
  assert.ok(proof.exclusions.some(e => e.reason === "invalid_continuation_outcome"));
  const service = summarizeServiceTime(partners.map((org, i) => entry(i, org, "evidence_review", 180, 10)), window);
  const gates = evaluateProofGates(proof, service, { cohortStartIso: iso(1), asOfIso: asOf,
    qualifiedProspects: 25, pricingIcpDisposition: true });
  assert.deepEqual(gates.gates.map(g => g.status), ["met", "met", "met", "met"]);
});

test("consent must be voluntary and scoped", () => {
  const r = summarizeCommercialProof([
    verified("case_study_consent_granted", "org-c-000001", 3, { voluntary: true, consentScopes: ["quote"] }),
    verified("case_study_consent_granted", "org-c-000002", 3, { voluntary: false, consentScopes: ["logo"] }),
    verified("case_study_consent_granted", "org-c-000003", 3, { voluntary: true, consentScopes: [] }),
  ], iso(10));
  assert.equal(r.consentOrgs, 1);
});

/* -------- scenarios -------- */

const scenarioInputs = { priceUsd: 299, churnRate: 0.1, feeRate: 0.05, flatFeeUsd: 0.5, providerCostUsd: 12,
  setupHours: 2, recurringHours: 4, sellingHoursPerNewClient: 2, acquisitionCashUsd: 20, hourlyCostUsd: 25,
  fixedCostUsd: 100, founderCapacityHours: 80 };

test("cohort scenario reproduces single-period helper and lags settlement", () => {
  const one = cohortScenario({ ...scenarioInputs, periods: 1, newClientsPerPeriod: [5], churnRate: 0,
    recurringHours: 4, refundRate: 0.01 });
  const helper = fourWeekPilotScenario({ clients: 5, priceUsd: 299, setupHours: 2, reviewHours: 3, supportHours: 1,
    hourlyCostUsd: 25, providerCostUsd: 12, fixedInfraUsd: 100, sellingHours: 2, acquisitionCashUsd: 20,
    feeRate: 0.05, flatFeeUsd: 0.5, refundReserveRate: 0.01, pilotCallLimit: 60, plannedCalls: 50 });
  assert.ok(Math.abs(one.rows[0].deliveryContributionUsd - helper.deliveryContributionUsd) < 1e-9);
  assert.ok(Math.abs(one.rows[0].contributionAfterAcquisitionAndFixedUsd - helper.afterAcquisitionAndFixedUsd) < 1e-9);
  assert.equal(one.rows[0].recurringRevenueRunRateUsd, 0, "pilot period is not recurring revenue");

  const lagged = cohortScenario({ ...scenarioInputs, periods: 3, newClientsPerPeriod: [5, 0, 0], settlementLagPeriods: 1 });
  assert.equal(lagged.rows[0].settledCashInUsd, 0);
  assert.ok(lagged.rows[1].settledCashInUsd > 0);
  assert.ok(lagged.cashUnsettledAtEndUsd > 0);
  assert.ok(Math.abs(lagged.rows[2].activeClients - 5 * 0.81) < 1e-9);
  assert.equal(lagged.evidenceType, "scenario_not_receipt");
});

test("capacity breach is reported at 20 clients with 4h recurring + selling", () => {
  const r = cohortScenario({ ...scenarioInputs, periods: 3, newClientsPerPeriod: [20, 0, 0] });
  assert.equal(r.capacityBreachPeriod, 1); // 20*4 + 20*2 + 20*2 = 160h > 80h
  assert.throws(() => cohortScenario({ ...scenarioInputs, periods: 2, newClientsPerPeriod: [1] }), /per period/);
  assert.throws(() => cohortScenario({ ...scenarioInputs, periods: 1, newClientsPerPeriod: [1], churnRate: 1.5 }), /bounded/);
});

/* -------- investor claims -------- */

test("investor claims: forecasts/research never become traction; MRR needs recurring ledger", () => {
  const asOf = iso(13);
  assert.equal(classifyInvestorClaim({ metric: "mrr", evidenceType: "forecast" }, asOf).usage, "forecast_labelled_only");
  assert.equal(classifyInvestorClaim({ metric: "customers", evidenceType: "research" }, asOf).usage, "market_context_only");
  assert.equal(classifyInvestorClaim({ metric: "paying_customers", evidenceType: "receipt", sourceRefs: [], asOf: iso(10) }, asOf).reason,
    "missing_source_reference");
  assert.equal(classifyInvestorClaim({ metric: "mrr", evidenceType: "receipt", sourceRefs: ["txn_01abcdef"], asOf: iso(10) }, asOf).reason,
    "mrr_requires_recurring_billing_ledger");
  assert.equal(classifyInvestorClaim({ metric: "logos", evidenceType: "first_party_record", sourceRefs: ["consent-0001x"], asOf: iso(10) }, asOf).reason,
    "publication_requires_specific_consent");
  assert.equal(classifyInvestorClaim({ metric: "paying_customers", evidenceType: "receipt", sourceRefs: ["txn_01abcdef"],
    asOf: iso(10), includesInternalOrTestAccounts: true }, asOf).reason, "internal_or_test_accounts_included");
  assert.equal(classifyInvestorClaim({ metric: "paying_customers", evidenceType: "receipt", sourceRefs: ["txn_01abcdef"],
    asOf: iso(20) }, asOf).reason, "missing_or_future_as_of");
  assert.equal(classifyInvestorClaim({ metric: "paying_customers", evidenceType: "receipt", sourceRefs: ["txn_01abcdef"],
    asOf: iso(10) }, asOf).usage, "traction_with_citation");
});
