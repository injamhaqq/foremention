import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260830000600_outcomes_value_customer_success.sql";

test("outcome provenance is tenant-scoped, append-only, and linked to Recommendation Records", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create table public\.outcome_ledger_events/i);
  assert.match(sql, /organization_id uuid not null references public\.organizations/i);
  assert.match(sql, /project_id uuid not null references public\.projects/i);
  assert.match(sql, /recommendation_record_run_id uuid references public\.runs/i);
  assert.match(sql, /resolution_asset_evidence_id uuid references public\.resolution_asset_evidence/i);
  assert.match(sql, /event_type in \('observation','evidence','recommendation','decision','action','ownership','completion','measurement','outcome'\)/i);
  assert.match(sql, /causal_attribution = 'not_claimed'/i);
  assert.match(sql, /supersedes_event_id uuid references public\.outcome_ledger_events/i);
  assert.match(sql, /before update or delete on public\.outcome_ledger_events/i);
  assert.match(sql, /Outcome ledger events are append-only/i);
  assert.match(sql, /alter table public\.outcome_ledger_events enable row level security/i);
  assert.match(sql, /public\.is_org_member\(organization_id\)/i);
  assert.match(sql, /revoke insert, update, delete on public\.outcome_ledger_events from authenticated/i);
});

test("existing authoritative resolution events feed the ledger instead of a duplicate workflow", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /after insert or update on public\.resolution_assets/i);
  assert.match(sql, /after insert on public\.resolution_asset_evidence/i);
  assert.match(sql, /after update of owner_id, due_at, next_action on public\.opportunities/i);
  assert.match(sql, /after insert or update on public\.resolution_follow_ups/i);
  assert.match(sql, /new\.created_by/);
  assert.match(sql, /new\.decision_by/);
  assert.match(sql, /new\.approved_by/);
  assert.match(sql, /new\.applied_by/);
  assert.match(sql, /new\.requested_by/);
  assert.match(sql, /new\.recorded_by/);
  assert.match(sql, /new\.status = 'complete' then true when new\.status = 'incomparable' then false/i);
});

test("customer success structures require explicit evidence for scored or risky states", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create table public\.customer_success_profiles/i);
  assert.match(sql, /account_goal text/i);
  assert.match(sql, /champion_name text/i);
  assert.match(sql, /executive_sponsor_name text/i);
  assert.match(sql, /activation_state/i);
  assert.match(sql, /adoption_state/i);
  assert.match(sql, /health_score numeric/i);
  assert.match(sql, /renewal_risk/i);
  assert.match(sql, /next_qbr_at/i);
  assert.match(sql, /renewal_at/i);
  assert.match(sql, /expansion_opportunity/i);
  assert.match(sql, /advocate_readiness/i);
  assert.match(sql, /health_score is null or nullif\(trim\(health_score_basis\), ''\) is not null/i);
  assert.match(sql, /adoption_state = 'unknown' or nullif\(trim\(adoption_basis\), ''\) is not null/i);
  assert.match(sql, /renewal_risk = 'unknown' or nullif\(trim\(renewal_risk_basis\), ''\) is not null/i);
  assert.doesNotMatch(sql, /insert into public\.customer_success_profiles/i);
});

test("customer success reviews preserve history and cannot invent economic ROI", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create table public\.customer_success_reviews/i);
  assert.match(sql, /review_type in \('onboarding','success_review','qbr','business_value','renewal','expansion','advocacy'\)/i);
  assert.match(sql, /economic_value_status text not null default 'not_demonstrated'/i);
  assert.match(sql, /economic_value_status = 'not_demonstrated'[\s\S]*economic_value_amount is null[\s\S]*economic_value_currency is null/i);
  assert.match(sql, /economic_value_status = 'verified'[\s\S]*economic_value_amount is not null[\s\S]*economic_value_currency ~ '\^\[A-Z\]\{3\}\$'[\s\S]*economic_value_basis/i);
  assert.match(sql, /before update or delete on public\.customer_success_reviews/i);
  assert.match(sql, /add a new review instead of rewriting history/i);
  assert.match(sql, /actor_id = auth\.uid\(\)/i);
});

test("the board export carries the same truth boundary", async () => {
  const page = await text("app/app/outcomes/print/page.tsx");
  assert.match(page, /Board-ready Business Value Review/);
  assert.match(page, /Economic ROI is not demonstrated/);
  assert.match(page, /not causal attribution/i);
  assert.match(page, /Operational value is not automatically economic ROI/i);
  assert.doesNotMatch(page, /guaranteed|caused the improvement|increase revenue/i);
});
