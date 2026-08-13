import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260813083000_provider_cost_event_guard.sql", import.meta.url);

async function migrationSql() {
  return readFile(migrationPath, "utf8");
}

test("tokenless failed provider estimates are excluded from spend events", async () => {
  const sql = await migrationSql();

  assert.match(sql, /linked_attempt_status in \('failed', 'rate_limited'\)/);
  assert.match(sql, /new\.cost_source = 'estimated'/);
  assert.match(sql, /new\.input_tokens is null/);
  assert.match(sql, /new\.output_tokens is null/);
  assert.match(sql, /new\.total_tokens is null/);
  assert.match(sql, /return null;/);
});

test("the accounting guard is enforced at the ai_cost_events table boundary", async () => {
  const sql = await migrationSql();

  assert.match(sql, /before insert or update on public\.ai_cost_events/);
  assert.match(sql, /execute function public\.guard_provider_cost_event\(\)/);
  assert.match(sql, /revoke all on function public\.guard_provider_cost_event\(\) from authenticated/);
});
