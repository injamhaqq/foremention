import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const {
  COMMERCIAL_STAGES,
  PRICING_EVIDENCE_STATES,
  PRICING_RESEARCH_DIMENSIONS,
  canTransitionCommercialStage,
  computeCommercialMetrics,
} = await import("../lib/commercial.ts");

test("commercial pipeline has explicit stages and closed deals cannot silently reopen", () => {
  assert.deepEqual(COMMERCIAL_STAGES, [
    "prospect",
    "discovery",
    "qualified",
    "demo",
    "proposal",
    "security_review",
    "procurement",
    "negotiation",
    "won",
    "lost",
  ]);
  assert.equal(canTransitionCommercialStage("proposal", "security_review"), true);
  assert.equal(canTransitionCommercialStage("negotiation", "won"), true);
  assert.equal(canTransitionCommercialStage("won", "proposal"), false);
  assert.equal(canTransitionCommercialStage("lost", "discovery"), false);
});

test("pricing research separates facts, experiments, hypotheses and targets without a result default", () => {
  assert.deepEqual(PRICING_EVIDENCE_STATES, ["current_fact", "experiment", "hypothesis", "future_target"]);
  for (const dimension of [
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
  ]) assert.equal(PRICING_RESEARCH_DIMENSIONS.includes(dimension), true, dimension);
});

test("commercial metrics remain null until their real denominators or financial inputs exist", () => {
  const empty = computeCommercialMetrics({});
  assert.equal(empty.leads, null);
  assert.equal(empty.winRate, null);
  assert.equal(empty.acvCents, null);
  assert.equal(empty.cacCents, null);
  assert.equal(empty.paybackMonths, null);
  assert.equal(empty.grr, null);
  assert.equal(empty.nrr, null);
  assert.equal(empty.grossMargin, null);
});

test("commercial metrics compute from supplied observed inputs only", () => {
  const result = computeCommercialMetrics({
    leadCount: 20,
    qualifiedOpportunityCount: 8,
    demoCount: 6,
    designPartnerCount: 3,
    wonCount: 3,
    lostCount: 2,
    wonAcvCents: [120000, 180000, 300000],
    salesCycleDays: [30, 45, 60],
    salesAndMarketingSpendCents: 450000,
    newCustomerAnnualGrossProfitCents: 900000,
    revenueCents: 1000000,
    serviceCogsCents: 250000,
    startingMrrCents: 1000000,
    newMrrCents: 100000,
    expansionMrrCents: 80000,
    contractionMrrCents: 30000,
    churnedMrrCents: 50000,
  });
  assert.equal(result.leads, 20);
  assert.equal(result.qualifiedOpportunities, 8);
  assert.equal(result.demos, 6);
  assert.equal(result.designPartners, 3);
  assert.equal(result.winRate, 0.6);
  assert.equal(result.qualifiedToWonConversion, 0.375);
  assert.equal(result.acvCents, 200000);
  assert.equal(result.salesCycleDays, 45);
  assert.equal(result.cacCents, 150000);
  assert.equal(result.paybackMonths, 6);
  assert.equal(result.grossMargin, 0.75);
  assert.equal(result.grr, 0.92);
  assert.equal(result.nrr, 1.1);
});

test("commercial database is founder-internal, auditable and pricing facts require evidence", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260830000300_commercial_engine.sql", import.meta.url), "utf8");
  for (const table of [
    "commercial_accounts",
    "commercial_contacts",
    "commercial_opportunities",
    "commercial_stage_events",
    "commercial_activities",
    "pricing_research_records",
    "commercial_metric_periods",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /evidence_state <> 'current_fact'[\s\S]*evidence_source is not null[\s\S]*observed_at is not null/i);
  assert.match(migration, /prevent_commercial_audit_mutation/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*commercial_accounts/i);
});
