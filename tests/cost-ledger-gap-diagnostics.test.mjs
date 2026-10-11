import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sql = await readFile(new URL("scripts/diagnose-cost-ledger-gaps.sql", root), "utf8");
const doc = await readFile(new URL("docs/operations/COST-LEDGER-GAP-RECONCILIATION-329.md", root), "utf8");
const view = await readFile(new URL("supabase/migrations/20260926071500_company_operational_cost_readiness.sql", root), "utf8");
const code = sql.replace(/--[^\n]*/g, "");

test("#329 gap diagnostic is strictly read-only and always rolls back", () => {
  assert.match(code, /begin transaction read only;/);
  assert.match(code, /rollback;\s*$/);
  assert.doesNotMatch(code, /\bcommit\b/i);
  assert.doesNotMatch(code, /\b(insert\s+into|update\s+public\.|delete\s+from|alter\s+table|create\s+|drop\s+|truncate|grant|revoke)\b/i);
});

test("#329 gap diagnostic uses the same gap definition as the operator cost view", () => {
  for (const source of [code, view]) {
    assert.match(source, /status in \('complete', 'failed', 'rate_limited'\)/);
    assert.match(source, /estimated_cost_usd is not null/);
    assert.match(source, /ace\.run_attempt_id = attempt\.id\s+and ace\.organization_id = attempt\.organization_id/);
  }
});

test("#329 gap diagnostic never infers an incurred charge or a provider-reported cost", () => {
  assert.match(code, /'unknown_requires_vendor_billing_evidence'::text as incurred_charge_status/);
  assert.match(code, /predates_atomic_ledger_trigger/);
  assert.doesNotMatch(code, /provider_reported/);
  assert.match(doc, /Status: \*\*documented, not repaired\.\*\*/);
  assert.match(doc, /on conflict \(run_attempt_id\) do nothing/);
  assert.match(doc, /Never convert `estimated` into `provider_reported`/);
});
