import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationFile = new URL("../supabase/migrations/20261016130000_chat04_strict_decision_save_replay.sql", import.meta.url);
const source = () => readFile(migrationFile, "utf8");

test("strict replay correction is forward-only and keeps existing RPC argument signature", async () => {
  const sql = await source();
  assert.match(sql, /^-- FM360 \/ Chat04/);
  assert.match(sql, /create or replace function public\.save_record_decision\(/i);
  assert.match(sql, /grant execute on function public\.save_record_decision\(uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean\)/i);
  assert.ok(!/drop table|truncate table|delete from public\.record_decisions/i.test(sql));
  assert.match(sql, /begin;[\s\S]*commit;/);
});

test("same-key both ordinary and concurrent-conflict branches compare ALL material fields", async () => {
  const sql = await source();
  const helper = sql.slice(sql.indexOf("create or replace function private.match_record_decision_save_request"), sql.indexOf("-- Strictly idempotent save"));
  for (const field of ["baseline_run_id", "decision_kind", "decision_state", "rationale",
    "change_specification_id", "decided_by", "approved_by", "approved_at", "owner_id",
    "owner_role", "action_summary", "due_date"]) {
    assert.ok(helper.includes("p_stored." + field), field);
  }
  assert.ok(helper.includes("p_stored.decided_by is not distinct from p_actor"));
  assert.ok(helper.includes("btrim(p_rationale)"));
  assert.ok(helper.includes("nullif(btrim(p_owner_role), '')"));
  assert.ok(helper.includes("nullif(btrim(p_action_summary), '')"));
  assert.equal((sql.match(/if not private\.match_record_decision_save_request\(/g) || []).length, 2);
  assert.match(sql, /on conflict \(organization_id, project_id, save_key\) do nothing/i);
  assert.match(sql, /raise exception 'This save key belongs to a different decision' using errcode = 'PT409'/);
});

test("the private comparison helper is not granted directly to untrusted roles", async () => {
  const sql = await source();
  assert.match(sql, /revoke all on function private\.match_record_decision_save_request/);
  assert.ok(!/grant execute on function private\.match_record_decision_save_request.*to authenticated/i.test(sql));
  assert.match(sql, /v_actor uuid := auth\.uid\(\)/);
  assert.match(sql, /private\.has_org_role/);
});
