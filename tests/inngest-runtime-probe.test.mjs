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

test("production probe derives the SHA from the deployed binding and never caller input", async () => {
  const route = await text("app/api/ops/inngest-probe/route.ts");
  assert.match(route, /process\.env\.FOREMENTION_BUILD_COMMIT/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.doesNotMatch(route, /new URL\("\/api\/health"/);
  assert.match(route, /runtime_service_probes\?on_conflict=service,build_commit/);
  assert.match(route, /resolution=ignore-duplicates,return=representation/);
  assert.match(route, /id: `runtime-probe-\$\{buildCommit\}`/);
  assert.match(route, /name: "foremention\/runtime\.probe"/);
  assert.match(route, /executed_at=is\.null/);
  assert.match(route, /method: "DELETE"/);
});

test("probe failures expose only bounded operational stages", async () => {
  const route = await text("app/api/ops/inngest-probe/route.ts");
  assert.match(route, /type ProbeStage = "build_resolution" \| "load_probe" \| "create_probe" \| "dispatch"/);
  assert.match(route, /stage,/);
  assert.doesNotMatch(route, /error\.message|String\(error\)|stack/);
});

test("Inngest serve route registers the heartbeat function", async () => {
  const route = await text("app/api/inngest/route.ts");
  assert.match(route, /runtimeServiceProbe/);
  assert.match(route, /functions: \[[^\]]*runtimeServiceProbe[^\]]*\]/s);
});

test("production sync asks only the deployed serve endpoint to register its current functions", async () => {
  const sync = await text("scripts/production-inngest-sync.mjs");
  assert.match(sync, /const endpoint = `\$\{baseUrl\}\/api\/inngest`/);
  assert.match(sync, /method: "PUT"/);
  assert.match(sync, /AbortSignal\.timeout\(15_000\)/);
  assert.match(sync, /await response\.text\(\)/);
  assert.doesNotMatch(sync, /INNGEST_(SIGNING|EVENT|API)_KEY/);
  assert.doesNotMatch(sync, /console\.log\([^\n]*response|console\.log\([^\n]*body/);
});

test("main CI proves the release before sync and sync before the diagnostic heartbeat", async () => {
  const workflow = await text(".github/workflows/ci.yml");
  const releaseIndex = workflow.indexOf("name: Verify exact Cloudflare production release");
  const syncIndex = workflow.indexOf("name: Sync live Inngest functions");
  const probeIndex = workflow.indexOf("name: Probe live Inngest execution");
  assert.ok(releaseIndex >= 0 && syncIndex > releaseIndex && probeIndex > syncIndex);
  assert.match(workflow, /name: Sync live Inngest functions[\s\S]*?continue-on-error: true[\s\S]*?node scripts\/production-inngest-sync\.mjs/);
  assert.match(workflow, /name: Probe live Inngest execution[\s\S]*?continue-on-error: true[\s\S]*?node scripts\/production-inngest-smoke\.mjs/);
  assert.match(workflow, /FOREMENTION_EXPECTED_BUILD_COMMIT: \$\{\{ github\.sha \}\}/);
});
