import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260918000300_agent_action_execution.sql", import.meta.url),
  "utf8",
);

test("agent executions are service-only and one-per-action", () => {
  assert.match(migration, /action_id uuid not null unique references public\.agent_actions/i);
  assert.match(migration, /alter table public\.agent_action_executions enable row level security/i);
  assert.match(migration, /revoke all on table public\.agent_action_executions from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.agent_action_executions to service_role/i);
});

test("execution claim is restricted to approved customer success external communication", () => {
  assert.match(migration, /status = 'approved'/i);
  assert.match(migration, /requires_approval = true/i);
  assert.match(migration, /agent_id = 'customer-success'/i);
  assert.match(migration, /action_type = 'customer_success_message_draft'/i);
  assert.match(migration, /effect_class = 'external_communication'/i);
  assert.match(migration, /risk_level = 'medium'/i);
});

test("uncertain outcomes remain executing instead of becoming retryable", () => {
  assert.match(migration, /when 'uncertain' then 'executing'/i);
  assert.match(migration, /when p_status = 'uncertain' then null/i);
});
