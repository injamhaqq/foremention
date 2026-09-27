import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the terminal cost regression runs only in CI's isolated reset database", async () => {
  const [sql, workflow] = await Promise.all([
    read("../scripts/verify-terminal-attempt-ledger.sql"),
    read("../.github/workflows/ci.yml"),
  ]);
  assert.match(workflow, /supabase db start\s*\n\s*supabase db reset/);
  assert.match(workflow, /docker exec -i supabase_db_foremention-mvp psql[^\n]+< scripts\/verify-terminal-attempt-ledger\.sql/);
  assert.match(sql, /^\\set ON_ERROR_STOP on/m);
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^set local statement_timeout = '30s';$/m);
  assert.match(sql, /^rollback;$/m);
  assert.doesNotMatch(sql, /\b(?:connect|create extension|alter table|update auth\.users|update public\.schema_migrations)\b/i);
});

test("isolated fixture proves both conservative tokenless suppression and separate eligible receipts", async () => {
  const [sql, ledger, guard] = await Promise.all([
    read("../scripts/verify-terminal-attempt-ledger.sql"),
    read("../supabase/migrations/20260915171500_provider_attempt_cost_ledger.sql"),
    read("../supabase/migrations/20260813083000_provider_cost_event_guard.sql"),
  ]);
  for (const caseText of [
    "status='complete'", "cost_source='provider_reported'",
    "status='failed', estimated_cost_usd=0.000023",
    "status='rate_limited', estimated_cost_usd=0.000000",
    "4, 'failed', now(), null",
    "estimated_cost_usd=0.000007",
    "5, 'failed', 3, 3, 0.000005",
    "Guard incorrectly booked tokenless failed estimates",
    "Five distinct eligible metered or provider-reported cost receipts",
    "Running attempt generated a premature ledger charge",
  ]) {
    assert.ok(sql.includes(caseText), `missing ledger scenario: ${caseText}`);
  }
  assert.match(ledger, /on conflict \(run_attempt_id\) do update set/);
  assert.match(guard, /linked_attempt_status in \('failed', 'rate_limited'\)/);
  assert.match(guard, /new\.cost_source = 'estimated'/);
  assert.match(guard, /new\.input_tokens is null/);
  assert.match(guard, /return null;/);
  assert.match(sql, /has_function_privilege\('authenticated','public\.ledger_run_attempt_cost\(\)','EXECUTE'\)/);
  assert.match(sql, /has_function_privilege\('authenticated','public\.guard_provider_cost_event\(\)','EXECUTE'\)/);
  assert.doesNotMatch(sql, /https?:\/\/[^\s]*/i);
});
