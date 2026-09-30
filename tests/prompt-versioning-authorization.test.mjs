import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("prompt versioning SECURITY DEFINER RPC keeps explicit actor, role and organization boundaries", async () => {
  const migration = await text("supabase/migrations/20260915160000_atomic_prompt_versioning.sql");
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /if actor_id is null/);
  assert.match(migration, /public\.has_org_role\([\s\S]*array\['owner','admin','analyst'\]/);
  assert.match(migration, /prompt\.id = p_prompt_id[\s\S]*prompt\.organization_id = p_organization_id/);
  assert.match(migration, /revoke all on function public\.update_prompt_versioned[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.update_prompt_versioned[\s\S]*to authenticated, service_role/);
});

test("CI proves authorized edit plus cross-tenant, mismatched-org and viewer denial against replayed migrations", async () => {
  const [ci, proof] = await Promise.all([
    text(".github/workflows/ci.yml"),
    text("scripts/verify-prompt-versioning-authorization.sql"),
  ]);
  assert.match(ci, /verify-prompt-versioning-authorization\.sql/);
  assert.match(proof, /set local role authenticated/);
  assert.match(proof, /Analyst-authorized Tenant A buyer question/);
  assert.match(proof, /Cross-tenant RPC call was not rejected/);
  assert.match(proof, /Mismatched prompt\/org IDs escaped/);
  assert.match(proof, /Authenticated viewer gained definer-RPC write access/);
  assert.match(proof, /Denied RPC path mutated Tenant B prompt state/);
  assert.match(proof, /rollback;/);
  assert.doesNotMatch(proof, /service_role.*set_config\('request\.jwt\.claim\.sub'/s);
});
