import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
}

const [retention, attentionRoute, metrics, proofMigration, handoff] = await Promise.all([
  text("lib/retention-loop.ts"),
  text("app/api/retention/attention/route.ts"),
  text("lib/pmf-metrics.ts"),
  text("supabase/migrations/20260830000300_customer_proof_events.sql"),
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
  assert.match(retention, /if \(!input\.firstActionAssigned\)[\s\S]{0,260}action_assigned/);
  assert.ok(retention.indexOf('key: "first_action"') < retention.indexOf('key: "action_assigned"'));
  assert.ok(retention.indexOf('key: "action_assigned"') < retention.indexOf('key: "second_comparable_cycle"'));
});

test("Attention derives action assignment from persisted owner state instead of assuming created means owned", () => {
  assert.match(attentionRoute, /owner_id/);
  assert.match(attentionRoute, /firstActionAssigned/);
  assert.match(attentionRoute, /firstAction\.some\([\s\S]{0,100}owner_id/);
  assert.match(attentionRoute, /firstActionAssigned,/);
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

test("customer proof infrastructure is service-only, RLS-protected, and stores no fake proof", () => {
  assert.match(proofMigration, /create table if not exists public\.customer_proof_events/i);
  assert.match(proofMigration, /organization_id uuid references public\.organizations/i);
  assert.match(proofMigration, /design_partner_application_id uuid references public\.design_partner_applications/i);
  for (const kind of ["interview", "objection", "lost_deal", "feature_request", "use_case", "renewal", "expansion", "referral", "churn"]) {
    assert.match(proofMigration, new RegExp(`'${kind}'`));
  }
  assert.match(proofMigration, /enable row level security/i);
  assert.match(proofMigration, /revoke all on table public\.customer_proof_events from anon, authenticated/i);
  assert.doesNotMatch(proofMigration, /insert into public\.customer_proof_events/i);
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
