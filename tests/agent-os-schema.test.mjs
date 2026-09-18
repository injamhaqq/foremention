import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260918000100_operating_agent_action_ledger.sql", import.meta.url), "utf8");

test("operating agent ledger is service-only and RLS protected", () => {
  assert.match(migration, /alter table public\.agent_actions enable row level security/i);
  assert.match(migration, /revoke all on table public\.agent_actions from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.agent_actions to service_role/i);
});

test("consequential actions are structurally approval-gated", () => {
  assert.match(migration, /agent_actions_consequential_approval_check/i);
  for (const effect of ["external_communication", "commercial_commitment", "financial", "production_change", "destructive", "legal_compliance"]) {
    assert.match(migration, new RegExp(effect));
  }
  assert.match(migration, /requires_approval = true/i);
});

test("agent action records are idempotent and evidence-linked", () => {
  assert.match(migration, /idempotency_key text not null unique/i);
  assert.match(migration, /evidence_json jsonb not null/i);
  assert.match(migration, /confidence numeric\(4,3\)/i);
});
