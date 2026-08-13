import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260813170000_inngest_runtime_probe.sql";

test("runtime probe ledger is service-only and contains no tenant payload", async () => {
  const migration = await text(migrationPath);
  assert.match(migration, /create table if not exists public\.runtime_service_probes/i);
  assert.match(migration, /build_commit ~ '\^\[0-9a-f\]\{40\}\$'/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.runtime_service_probes from anon, authenticated/i);
  assert.match(migration, /to service_role/i);
  assert.doesNotMatch(migration, /organization_id|user_id|prompt_text|provider_response/i);
});

test("Inngest heartbeat executes only a previously requested exact build", async () => {
  const job = await text("lib/jobs/runtime-probe.ts");
  assert.match(job, /foremention\/runtime\.probe/);
  assert.match(job, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(job, /load-requested-runtime-probe/);
  assert.match(job, /probe_not_requested/);
  assert.match(job, /executed_at=is\.null/);
  assert.doesNotMatch(job, /getProvider|provider_ids|organization_id|prompt_text/);
});

test("production probe endpoint derives the SHA from health and is idempotent", async () => {
  const route = await text("app/api/ops/inngest-probe/route.ts");
  assert.match(route, /new URL\("\/api\/health", request\.url\)/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.match(route, /runtime_service_probes\?on_conflict=service,build_commit/);
  assert.match(route, /resolution=ignore-duplicates,return=representation/);
  assert.match(route, /id: `runtime-probe-\$\{buildCommit\}`/);
  assert.match(route, /name: "foremention\/runtime\.probe"/);
  assert.match(route, /executed_at=is\.null/);
  assert.match(route, /method: "DELETE"/);
});

test("Inngest serve route registers the heartbeat function", async () => {
  const route = await text("app/api/inngest/route.ts");
  assert.match(route, /runtimeServiceProbe/);
  assert.match(route, /functions: \[[^\]]*runtimeServiceProbe[^\]]*\]/s);
});

test("main CI observes the live Inngest probe without blocking the first rollout", async () => {
  const workflow = await text(".github/workflows/ci.yml");
  assert.match(workflow, /name: Probe live Inngest execution/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /node scripts\/production-inngest-smoke\.mjs/);
  assert.match(workflow, /FOREMENTION_EXPECTED_BUILD_COMMIT: \$\{\{ github\.sha \}\}/);
});
