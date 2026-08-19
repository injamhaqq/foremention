import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production run accounting RPCs remain unavailable to browser sessions", async () => {
  const hardening = await read("supabase/migrations/20260816192504_tighten_service_only_run_rpcs.sql");

  for (const signature of [
    "release_queued_run\\(uuid, uuid, text\\)",
    "reserve_run_budget\\(uuid, uuid, numeric\\)",
    "reserve_run_quota\\(uuid, integer, uuid\\)",
  ]) {
    assert.match(hardening, new RegExp(`revoke execute on function public\\.${signature} from authenticated`, "i"));
  }
  assert.doesNotMatch(hardening, /grant execute[\s\S]*to authenticated/i);
});

test("service-only run RPCs carry explicit actor context and re-check authorization", async () => {
  const migration = await read("supabase/migrations/20260819154000_service_only_run_rpc_actor_context.sql");

  for (const functionName of [
    "reserve_run_quota_server",
    "reserve_run_budget_server",
    "release_queued_run_server",
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${functionName}`, "i"));
    assert.match(migration, new RegExp(`revoke all on function public\\.${functionName}[\\s\\S]*from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*to service_role`, "i"));
  }

  assert.match(migration, /p_actor_id uuid/i);
  assert.match(migration, /from public\.organization_members member[\s\S]*member\.user_id = p_actor_id/i);
  assert.match(migration, /member\.role in \('owner'::public\.organization_role, 'analyst'::public\.organization_role\)/i);
  assert.match(migration, /run\.created_by = p_actor_id[\s\S]*run\.status = 'queued'/i);
  assert.doesNotMatch(migration, /auth\.uid\(\)/i);
});

test("run routes invoke accounting RPCs only through the service boundary", async () => {
  const createRoute = await read("app/api/runs/route.ts");
  const cancelRoute = await read("app/api/runs/[id]/route.ts");

  for (const functionName of [
    "reserve_run_quota_server",
    "reserve_run_budget_server",
    "release_queued_run_server",
  ]) {
    assert.match(
      createRoute,
      new RegExp(`rpc/${functionName}[\\s\\S]{0,500}?serviceRole:\\s*true[\\s\\S]{0,500}?p_actor_id:\\s*viewer\\.id`, "i"),
    );
  }

  assert.match(
    cancelRoute,
    /rpc\/release_queued_run_server[\s\S]{0,500}?serviceRole:\s*true[\s\S]{0,500}?p_actor_id:\s*viewer\.id/i,
  );

  assert.doesNotMatch(createRoute, /rpc\/(reserve_run_quota|reserve_run_budget|release_queued_run)"/i);
  assert.doesNotMatch(cancelRoute, /rpc\/release_queued_run"/i);
});
