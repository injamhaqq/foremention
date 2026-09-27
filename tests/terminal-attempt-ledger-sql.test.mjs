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

test("isolated ledger fixture covers success, distinct retry, zero estimate, unknown cost and idempotent replay", async () => {
  const [sql, migration] = await Promise.all([
    read("../scripts/verify-terminal-attempt-ledger.sql"),
    read("../supabase/migrations/20260915171500_provider_attempt_cost_ledger.sql"),
  ]);
  for (const caseText of [
    "status='complete'", "cost_source='provider_reported'",
    "status='failed', estimated_cost_usd=0.000023", "status='rate_limited', estimated_cost_usd=0.000000",
    "4, 'failed', now(), null", "estimated_cost_usd=0.000007",
    "premature ledger charge", "exactly three receipts",
  ]) {
    assert.ok(sql.includes(caseText), `missing ledger scenario: ${caseText}`);
  }
  assert.match(migration, /on conflict \(run_attempt_id\) do update set/);
  assert.match(sql, /has_function_privilege\('authenticated','public\.ledger_run_attempt_cost\(\)','EXECUTE'\)/);
  assert.doesNotMatch(sql, /https?:\/\/[^\s]*/i);
});
