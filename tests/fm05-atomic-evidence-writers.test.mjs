import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("buyer-question POST atomically creates question and history through authenticated RPC", async () => {
  const route = await read("app/api/prompts/route.ts");
  const create = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function PATCH"));
  assert.match(create, /rpc\/create_prompt_versioned/);
  assert.match(create, /p_organization_id: context\.organizationId/);
  assert.match(create, /p_project_id: context\.projectId/);
  assert.match(create, /p_category_id: context\.categoryId/);
  assert.match(create, /p_cluster_id: clusterId/);
  assert.match(create, /token: viewer\.accessToken/);
  assert.doesNotMatch(create, /supabaseRest(?:<[^>]+>)?\("prompts"/);
  assert.doesNotMatch(create, /supabaseRest\("prompt_versions"/);
});

test("creation RPC preserves tenant authorization, project and cluster checks, serialized plan limit and atomic insert", async () => {
  const sql = await read("supabase/migrations/20261009000100_create_atomic_buyer_question_rpc.sql");
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /v_actor uuid := auth\.uid\(\)/);
  assert.match(sql, /public\.has_org_role/);
  assert.match(sql, /from public\.projects[\s\S]*for update/i);
  assert.match(sql, /project_id = p_project_id/);
  assert.match(sql, /from public\.prompt_clusters[\s\S]*project_id = p_project_id/i);
  assert.match(sql, /v_count >= 10/);
  assert.match(sql, /insert into public\.prompts/);
  assert.match(sql, /insert into public\.prompt_versions/);
  assert.match(sql, /revoke all on function public\.create_prompt_versioned/);
  assert.match(sql, /grant execute on function public\.create_prompt_versioned/);
});

test("provider receipts and buyer-question records can only be written through privileged code paths", async () => {
  const phase1 = await read("supabase/migrations/20261009000100_create_atomic_buyer_question_rpc.sql");
  const phase2 = await read("supabase/migrations/20261009000200_harden_evidence_writer_privileges.sql");
  assert.match(phase1, /revoke insert, update, delete on table[\\s\\S]*public\\.run_attempts[\\s\\S]*public\\.run_answers[\\s\\S]*public\\.citations[\\s\\S]*public\\.source_maps[\\s\\S]*public\\.source_observations[\\s\\S]*from authenticated/i);
  assert.match(phase1, /drop policy if exists source_maps_write_admin/i);
  assert.match(phase1, /drop policy if exists source_observations_write_analyst/i);
  assert.match(phase2, /revoke insert, update, delete on table public\.prompts from authenticated/i);
  assert.match(phase2, /revoke insert, update, delete on table public\.prompt_versions from authenticated/i);
  assert.match(phase2, /drop policy if exists prompt_versions_write_analyst/i);
  const job = await read("lib/jobs/inngest.ts");
  assert.match(job, /"run_attempts[?"]/);
  assert.match(job, /serviceRole: true/);
  const edit = await read("app/api/prompts/route.ts");
  assert.match(edit.slice(edit.indexOf("export async function PATCH")), /rpc\/update_prompt_versioned/);
});

test("four core project relationships are composite, validated and preserve FK names", async () => {
  const migration = await read("supabase/migrations/20261009000300_core_project_ownership_fks.sql");
  const liveFixture = await read("scripts/verify-fm05-atomic-evidence-writers.sql");
  for (const table of ["prompts", "prompt_clusters", "runs", "jobs"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}\\s+drop constraint ${table}_project_id_fkey`, "i"));
    assert.match(migration, new RegExp(`add constraint ${table}_project_id_fkey\\s+foreign key \\(organization_id, project_id\\)`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} validate constraint ${table}_project_id_fkey`, "i"));
    assert.match(liveFixture, new RegExp(`FM-05: project mismatch accepted in ${table === "prompt_clusters" ? "clusters" : table}`));
  }
  assert.match(migration, /on delete cascade not valid/gi);
  assert.match(liveFixture, /FM-05: composite root FK missing or unvalidated/);
});
