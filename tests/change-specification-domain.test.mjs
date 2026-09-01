import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("ChangeSpecification is first-class and execution assets are subordinate", async () => {
  const sql = await text("supabase/migrations/20260901000300_change_specification_domain.sql");
  assert.match(sql, /create table public\.change_specifications/i);
  assert.match(sql, /create table public\.change_specification_evidence/i);
  assert.match(sql, /create table public\.change_execution_assets/i);
  assert.match(sql, /CONTROLLABLE.*INFLUENCEABLE.*UNCONTROLLABLE/s);
  assert.match(sql, /DO_NOW.*TEST_FIRST.*DO_NOT_DO.*MONITOR_ONLY.*INSUFFICIENT_EVIDENCE/s);
  assert.match(sql, /ELIGIBLE.*PARTIALLY_ELIGIBLE.*STRUCTURALLY_INELIGIBLE.*UNKNOWN/s);
  assert.match(sql, /OBSERVED_FACT.*LIKELY_EXPLANATION.*HYPOTHESIS.*RECOMMENDED_EXPERIMENT.*VERIFIED_OUTCOME/s);
  assert.match(sql, /HIGH.*MEDIUM.*LOW.*INSUFFICIENT/s);
  assert.match(sql, /resolution_asset_id uuid not null references public\.resolution_assets/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /change_specifications_select_member/i);
  assert.match(sql, /change_specifications_insert_analyst/i);
  assert.doesNotMatch(sql, /insert into public\.change_specifications/i);
});

test("drafts can remain unknown but review submission is fail-closed", async () => {
  const sql = await text("supabase/migrations/20260901000300_change_specification_domain.sql");
  assert.match(sql, /eligibility_state text not null default 'UNKNOWN'/i);
  assert.match(sql, /decision_state text not null default 'INSUFFICIENT_EVIDENCE'/i);
  assert.match(sql, /truth_state text not null default 'HYPOTHESIS'/i);
  assert.match(sql, /confidence_state text not null default 'INSUFFICIENT'/i);
  assert.match(sql, /exact_change text/i);
  assert.match(sql, /owner_role text/i);
  assert.match(sql, /effort text/i);
  assert.match(sql, /Change Specification requires verified linked evidence before review/i);
  assert.match(sql, /Change Specification requires an exact company change before review/i);
  assert.match(sql, /Change Specification requires acceptance criteria before review/i);
  assert.match(sql, /Change Specification requires a verification plan before review/i);
  assert.match(sql, /submitted_by is distinct from auth\.uid\(\)/i);
});

test("evidence snapshots are canonicalized server-side and historical assets are not backfilled", async () => {
  const sql = await text("supabase/migrations/20260901000300_change_specification_domain.sql");
  assert.match(sql, /new\.evidence_snapshot := jsonb_build_object/i);
  assert.match(sql, /verification_status = 'verified'/i);
  assert.match(sql, /review_status = 'verified'/i);
  assert.doesNotMatch(sql, /update public\.resolution_assets/i);
  assert.doesNotMatch(sql, /insert into public\.change_execution_assets\s*select/i);
});
