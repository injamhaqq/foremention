import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("F14 production compatibility fallback stays fail-closed and service-only", async () => {
  const migration = await text("supabase/migrations/20260916000500_customer_value_compatibility_fallback.sql");
  assert.match(migration, /customer_confirmed_value/);
  assert.match(migration, /if not exists/i);
  assert.match(migration, /customer_success_reviews/);
  assert.match(migration, /event_type\s*=\s*'decision'/i);
  assert.match(migration, /actor_type\s*=\s*'user'/i);
  assert.match(migration, /comparison_eligible\s*=\s*true/i);
  assert.match(migration, /follow_up_run_id\s+is\s+not\s+null/i);
  assert.match(migration, /qualification_status\s*=\s*'qualified'/i);
  assert.match(migration, /included_in_company_kpis\s*=\s*true/i);
  assert.match(migration, /revoke all on table public\.customer_value_validation_evidence from public, anon, authenticated/i);
  assert.match(migration, /grant select on table public\.customer_value_validation_evidence to service_role/i);
});
