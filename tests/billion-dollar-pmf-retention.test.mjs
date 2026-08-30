import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
}

const [retention, attentionRoute, metrics, proofExtension, handoff] = await Promise.all([
  text("lib/retention-loop.ts"),
  text("app/api/retention/attention/route.ts"),
  text("lib/pmf-metrics.ts"),
  text("supabase/migrations/20260830000300_customer_proof_research_events.sql"),
  text("docs/billion-dollar-build/01-pmf-retention.md"),
]);

test("activation is the exact eight-stage PMF loop, including action assignment", () => {
  for (const stage of [
    "workspace_configured",
    "five_questions",
    "first_record",
    "first_review",
    "first_action",
    "action_assigned",
    "second_comparable_cycle",
    "retained_loop",
  ]) assert.match(retention, new RegExp(`\\"${stage}\\"`));
  assert.match(retention, /firstActionAssigned:\s*boolean/);
  assert.match(retention, /if \(!input\.firstActionAssigned\)[\s\S]{0,300}action_assigned/);
  assert.ok(retention.indexOf('key: "first_action"') < retention.indexOf('key: "action_assigned"'));
  assert.ok(retention.indexOf('key: "action_assigned"') < retention.indexOf('key: "second_comparable_cycle"'));
});

test("Attention derives action assignment and transparent retention health from persisted state", () => {
  assert.match(attentionRoute, /owner_id/);
  assert.match(attentionRoute, /firstActionAssigned/);
  assert.match(attentionRoute, /firstAction\.some\([\s\S]{0,100}owner_id/);
  assert.match(attentionRoute, /firstActionAssigned,/);
  assert.match(attentionRoute, /deriveRetentionHealth/);
  assert.match(attentionRoute, /retentionHealth/);
});

test("PMF metric definitions cover the required account-level loop without fabricated values", () => {
  assert.match(metrics, /export const PMF_METRIC_DEFINITIONS/);
  for (const metric of [
    "activation_rate",
    "first_record_review_rate",
    "action_creation_rate",
    "second_cycle_rate",
    "wau_accounts",
    "mau_accounts",
    "retained_account_rate",
    "time_to_first_value",
    "time_to_second_cycle",
    "design_partner_conversion",
    "paid_conversion",
  ]) assert.match(metrics, new RegExp(`\\b${metric}\\b`));
  assert.match(metrics, /requiresRealBilling:\s*true/);
  assert.match(metrics, /export function derivePmfMetrics/);
  assert.match(metrics, /insufficient_data/);
  assert.doesNotMatch(metrics, /sample|placeholder|mock customer/i);
});

test("customer proof extends the existing service-only commercial ledger instead of creating a parallel truth store", () => {
  assert.match(proofExtension, /alter table public\.commercial_accounts/i);
  assert.match(proofExtension, /design_partner_application_id uuid references public\.design_partner_applications/i);
  assert.match(proofExtension, /alter table public\.commercial_events/i);
  for (const kind of ["customer_interview", "objection_recorded", "lost_deal_recorded", "feature_request_recorded", "use_case_validated", "renewal_verified", "expansion_verified", "referral_verified", "churn_verified"]) {
    assert.match(proofExtension, new RegExp(`'${kind}'`));
  }
  assert.match(proofExtension, /revoke all on table public\.commercial_accounts, public\.commercial_events from anon, authenticated/i);
  assert.doesNotMatch(proofExtension, /create table if not exists public\.customer_proof_events/i);
  assert.doesNotMatch(proofExtension, /insert into public\.(commercial_accounts|commercial_events)/i);
});

test("handoff records the exact base SHA, hypothesis boundary, metric contract, and remaining evidence gaps", () => {
  assert.match(handoff, /df92e0eb78edda5c8c621bb1388c5b519b8da1e8/);
  assert.match(handoff, /Hypothesis vs validated fact/i);
  assert.match(handoff, /No customer evidence/i);
  assert.match(handoff, /action assigned/i);
  assert.match(handoff, /activation rate/i);
  assert.match(handoff, /WAU accounts/i);
  assert.match(handoff, /MAU accounts/i);
  assert.match(handoff, /time to first value/i);
  assert.match(handoff, /time to second cycle/i);
  assert.match(handoff, /design-partner conversion/i);
  assert.match(handoff, /paid conversion/i);
});
