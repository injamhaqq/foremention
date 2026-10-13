// Launch blocker "10-question cap" (Refs #516 #532): the atomic create RPC
// must take its ceiling from the persisted entitlement, not a hard-coded 10.
// The SQL behaviour itself runs in CI's isolated Supabase replay
// (scripts/verify-fm05-atomic-evidence-writers.sql: Foundation 10, grant 12).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("create_prompt_versioned capacity follows the entitlement, org-wide, with PT429", async () => {
  const sql = await read("supabase/migrations/20261013170000_create_prompt_entitlement_capacity.sql");
  assert.match(sql, /create or replace function public\.create_prompt_versioned\(/);
  assert.doesNotMatch(sql, /v_count >= 10/, "no hard-coded 10-question ceiling");
  assert.match(sql, /from public\.organization_entitlements e/);
  assert.match(sql, /e\.status = 'active' and \(e\.expires_at is null or e\.expires_at > now\(\)\) and e\.max_prompts > 0/);
  assert.match(sql, /where organization_id = p_organization_id and active;/, "counts active questions across the organization");
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('foremention\.buyer_question_admission:' \|\| p_organization_id::text, 0\)\)/);
  assert.match(sql, /raise sqlstate 'PT429'/);
  assert.match(sql, /security definer/);
  assert.match(sql, /grant execute on function public\.create_prompt_versioned\(uuid,uuid,uuid,uuid,text,text\)\s+to authenticated, service_role;/);
  for (const kept of ["Buyer-question creation requires workspace write access", "Project not found in this workspace", "Buyer-question cluster does not belong to the project", "'Created by workspace member'"]) {
    assert.ok(sql.includes(kept), `unchanged check kept: ${kept}`);
  }
});

test("the trigger and the RPC agree on the same admission key and Foundation default", async () => {
  const trigger = await read("supabase/migrations/20261011090000_package_capacity_from_verified_billing.sql");
  const rpc = await read("supabase/migrations/20261013170000_create_prompt_entitlement_capacity.sql");
  const key = "'foremention.buyer_question_admission:' || ";
  assert.ok(trigger.includes(key) && rpc.includes(key));
  assert.match(rpc, /else 10\s+end/);
  assert.match(rpc, /v_limit := coalesce\(v_limit, 10\);/);
  const verify = await read("scripts/verify-fm05-atomic-evidence-writers.sql");
  assert.match(verify, /customer-fm05-paid-13/);
  assert.match(verify, /Capacity: exceeded the entitlement ceiling/);
});
