import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260818000100_company_customer_proof.sql";

test("commercial proof schema is explicit, service-only, and never backfills traction", async () => {
  const migration = await text(migrationPath);

  for (const relation of [
    "company_organization_classifications",
    "commercial_accounts",
    "commercial_contacts",
    "commercial_opportunities",
    "commercial_events",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${relation}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${relation} enable row level security`, "i"));
  }

  assert.match(migration, /included_in_company_kpis boolean not null default false/i);
  assert.match(migration, /classification in \('unknown', 'internal', 'synthetic', 'benchmark', 'design_partner', 'customer'\)/i);
  assert.match(migration, /lifecycle_stage in \('target', 'qualified', 'contacted', 'conversation', 'design_partner', 'customer', 'churned', 'disqualified'\)/i);
  assert.match(migration, /stage in \('identified', 'discovery', 'demo', 'pilot_proposed', 'pilot_active', 'won', 'lost'\)/i);
  assert.match(migration, /event_type in \('outreach_sent', 'reply_received', 'conversation_held', 'discovery_held', 'demo_held', 'pilot_proposal_sent', 'pilot_started', 'pilot_completed', 'payment_verified', 'renewal_verified', 'expansion_verified', 'churn_verified', 'customer_success_checkpoint'\)/i);

  assert.match(migration, /revoke all on table[\s\S]*from anon, authenticated/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(company_organization_classifications|commercial_accounts|commercial_contacts|commercial_opportunities|commercial_events)/i);
});

test("company scorecard is aggregate-only and fail-closed for unclassified product organizations", async () => {
  const migration = await text(migrationPath);
  assert.match(migration, /create or replace view public\.company_ceo_scorecard/i);
  assert.match(migration, /create or replace view public\.company_customer_value_scorecard/i);
  assert.match(migration, /included_in_company_kpis = true/i);
  assert.match(migration, /count\(distinct ca\.id\).*target_accounts/is);
  assert.match(migration, /sum\(coalesce\(co\.mrr_usd, 0\)\).*mrr_usd/is);
  assert.match(migration, /sum\(coalesce\(co\.arr_usd, 0\)\).*arr_usd/is);
  assert.match(migration, /weekly_retained_value_organizations/i);
  assert.match(migration, /verified_improvement_organizations/i);
  assert.match(migration, /revoke all on table public\.company_ceo_scorecard from anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.company_customer_value_scorecard from anon, authenticated/i);
});

test("operating docs define one narrow ICP, one north star, and an evidence-first sales motion", async () => {
  const [commandCenter, sales] = await Promise.all([
    text("docs/CEO-COMPANY-COMMAND-CENTER.md"),
    text("docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md"),
  ]);

  assert.match(commandCenter, /Weekly retained organizations reaching a verified decision insight/i);
  assert.match(commandCenter, /insufficient data/i);
  assert.match(commandCenter, /PostHog.*product behavior/i);
  assert.match(commandCenter, /Supabase.*commercial/i);
  assert.match(commandCenter, /Observed change/i);
  assert.match(commandCenter, /Causally established change/i);

  assert.match(sales, /B2B SaaS/i);
  assert.match(sales, /50[–-]500 employees/i);
  assert.match(sales, /30-day proof pilot/i);
  assert.match(sales, /100.*target accounts/i);
  assert.match(sales, /40.*conversations/i);
  assert.match(sales, /15.*demos/i);
  assert.match(sales, /5.*pilot proposals/i);
  assert.match(sales, /3.*design partners/i);
  assert.match(sales, /1.*paid pilot/i);
  assert.doesNotMatch(sales, /guaranteed ROI|guaranteed improvement|guaranteed ranking/i);
});
