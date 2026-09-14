import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("scheduled measurement uses the same atomic quota and budget reservations as manual runs", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");
  assert.match(dispatcher, /rpc\/reserve_run_quota_server/);
  assert.match(dispatcher, /rpc\/reserve_run_budget_server/);
  assert.match(dispatcher, /rpc\/release_queued_run_server/);
  assert.doesNotMatch(dispatcher, /monthlyUsage|monthlyRuns|usedUnits|reservedSpend/);
  assert.doesNotMatch(dispatcher, /supabaseRest\("usage_events"/);
});

test("scheduled accounting preserves fail-closed actor authorization and admin parity", async () => {
  const [dispatcher, migration] = await Promise.all([
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("supabase/migrations/20260914000300_run_accounting_role_alignment.sql"),
  ]);
  assert.match(dispatcher, /if \(!schedule\.created_by\) return null/);
  assert.match(dispatcher, /p_actor_id: schedule\.created_by/);
  assert.match(migration, /member\.role in \([^)]*'owner'[^)]*'admin'[^)]*'analyst'[^)]*\)/is);
  for (const fn of ["reserve_run_quota_server", "reserve_run_budget_server", "release_queued_run_server"]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
  }
});
