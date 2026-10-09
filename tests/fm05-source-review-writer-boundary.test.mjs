import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("review route uses authenticated narrow RPC, derives actor and time from DB", async () => {
  const source = await read("app/api/sources/[id]/review/route.ts");
  assert.match(source, /rpc\/review_source_map_entry/);
  assert.match(source, /!\["owner", "admin", "analyst"\]\.includes\(role\)/);
  assert.match(source, /token: accessToken/);
  assert.match(source, /p_organization_id: organizationId/);
  assert.match(source, /p_project_id: context\.projectId/);
  assert.match(source, /p_category_id: context\.categoryId/);
  assert.match(source, /p_entry_id: entry\.id/);
  assert.match(source, /reviewedAt = reviewed\.reviewed_at/);
  assert.match(source, /reviewed\.reviewed_by !== viewer\.id/);
  assert.doesNotMatch(source, /supabaseRest\(\x60source_map_entries\?id=eq\.\$\{entry\.id\}/);
});

test("RPC enforces role, published project graph and exact review-only column list", async () => {
  const migration=await read("supabase/migrations/20261010000100_source_review_authorized_rpc.sql");
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /v_actor uuid := auth\.uid\(\)/);
  assert.match(migration, /public\.has_org_role/);
  assert.match(migration, /m\.status='published'/);
  assert.match(migration, /r\.project_id=p_project_id/);
  assert.match(migration, /m\.category_id=p_category_id/);
  assert.match(migration, /join public\.sources s/);
  assert.match(migration, /for update of e/);
  assert.match(migration, /reviewed_by=v_actor/);
  assert.match(migration, /reviewed_at=v_now/);
  assert.match(migration, /revoke all on function public\.review_source_map_entry/);
  assert.match(migration, /grant execute on function public\.review_source_map_entry/);
  const updateBody=migration.split("update public.source_map_entries e")[1].split("where e.id=")[0];
  for(const forbidden of ["rank=","citation_observations=","engines=","page_presence_state=","reference_origin=","crawler_access="]) {
    assert.ok(!updateBody.includes(forbidden),"collector-derived field write found: "+forbidden);
  }
});

test("activation removes direct member write rights but preserves service and member reads", async () => {
  const lockdown=await read("supabase/migrations/20261010000200_source_review_lock_down_table.sql");
  assert.match(lockdown,/revoke insert, update, delete on table public\.source_map_entries from authenticated/);
  assert.match(lockdown,/drop policy if exists source_map_entries_write_admin/);
  assert.match(lockdown,/drop policy if exists source_map_entries_write_analyst/);
  assert.doesNotMatch(lockdown,/revoke[^;]*service_role/i);
  const fixture=await read("scripts/verify-fm05-source-review-boundary.sql");
  for(const condition of ["cross-tenant source review permitted","sibling-project source review permitted","member mutated collector-owned ranking","viewer gained source review power","unpublished source review permitted"]) {
    assert.ok(fixture.includes(condition),"missing SQL denial: "+condition);
  }
  const ci=await read(".github/workflows/ci.yml");
  assert.ok(ci.includes("scripts/verify-fm05-source-review-boundary.sql"));
});
