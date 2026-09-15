import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("F14 requires explicit external customer value evidence", async () => {
  const migration = await text("supabase/migrations/20260915172000_customer_value_pilot_evidence_gates.sql");
  assert.match(migration, /customer_confirmed_value boolean not null default false/i);
  assert.match(migration, /confirmed_decision_event_id uuid references public\.outcome_ledger_events/i);
  assert.match(migration, /confirmed_second_use_assessment_id uuid references public\.change_verification_assessments/i);
  assert.match(migration, /event_type = 'decision'/i);
  assert.match(migration, /comparison_eligible = true/i);
  assert.match(migration, /customer_value_validation_evidence/i);
});

test("F16 requires a qualified paid pilot with a completed execution cycle", async () => {
  const migration = await text("supabase/migrations/20260915172000_customer_value_pilot_evidence_gates.sql");
  assert.match(migration, /qualified_paid_pilot_evidence/i);
  assert.match(migration, /qualification_status = 'qualified'/i);
  assert.match(migration, /commercial_model = 'pilot'/i);
  assert.match(migration, /stage = 'won'/i);
  assert.match(migration, /paid_value_usd > 0/i);
  assert.match(migration, /payment_verified/i);
  assert.match(migration, /lifecycle_state = 'completed'/i);
});
