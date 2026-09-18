import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260918000200_agent_reasoning_runtime.sql", import.meta.url), "utf8");

test("reasoning ledger is service-only", () => {
  assert.match(migration, /alter table public\.agent_reasoning_runs enable row level security/i);
  assert.match(migration, /revoke all on table public\.agent_reasoning_runs from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.agent_reasoning_runs to service_role/i);
});

test("reasoning reservation is atomic and daily-cost bounded", () => {
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /p_daily_cost_cap_usd/i);
  assert.match(migration, /reserved_usd \+ p_estimated_max_cost_usd > p_daily_cost_cap_usd/i);
  assert.match(migration, /idempotency_key text not null unique/i);
});

test("reasoning requires a reviewed terminal collection", () => {
  assert.match(migration, /status in \('complete','partial'\)/i);
  assert.match(migration, /reviewed_terminal_run_required/i);
});
