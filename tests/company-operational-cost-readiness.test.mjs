import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/migrations/20260926071500_company_operational_cost_readiness.sql", import.meta.url), "utf8");

test("company cost diagnostics are invoker-safe and never exposed to customer sessions", () => {
  assert.match(sql, /create or replace view public\.company_operational_cost_readiness\s+with \(security_invoker = true\)/i);
  assert.match(sql, /revoke all on table public\.company_operational_cost_readiness from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.company_operational_cost_readiness to service_role/i);
  assert.doesNotMatch(sql, /grant .*\b(authenticated|anon)\b.*company_operational_cost_readiness/i);
});

test("missing costs and synthetic activity cannot turn into customer gross margin", () => {
  assert.match(sql, /classification in \('design_partner', 'customer'\)/);
  assert.match(sql, /included_in_company_kpis = true/);
  assert.match(sql, /oe\.event_type = 'decision'/);
  assert.match(sql, /oe\.actor_type = 'user'/);
  assert.match(sql, /unclassified_organizations/);
  assert.match(sql, /terminal_attempts_missing_a_cost_ledger_entry/);
  assert.match(sql, /provider_reported_event_count/);
  assert.match(sql, /estimated_or_unknown_event_count/);
  assert.match(sql, /case when review_events\.external_reviewed_decisions > 0/);
  assert.match(sql, /else null\s+end as recorded_external_ai_cost_per_reviewed_decision_usd/i);
  assert.match(sql, /null::numeric\(14,6\) as verified_total_cost_per_reviewed_decision_usd/i);
});

test("the cost report is strictly read-only and seeds no invented actuals", () => {
  assert.doesNotMatch(sql, /\b(insert into|update public\.|delete from|alter table public\.)/i);
  assert.match(sql, /from public\.ai_cost_events/);
  assert.match(sql, /from public\.infrastructure_cost_allocations/);
  assert.match(sql, /from public\.run_attempts/);
});
