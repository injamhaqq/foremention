import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=file=>readFile(new URL(file,import.meta.url),"utf8");

test("compiled production Worker experiment uses isolated programmatic Workerd and real strict local API fixtures",async()=>{
  const [script,workflow,client]=await Promise.all([
    read("../scripts/isolated-programmatic-worker-harness.mjs"),
    read("../.github/workflows/isolated-programmatic-worker.yml"),
    read("../scripts/isolated-customer-api.mjs"),
  ]);
  for(const required of [
    "createTestHarness", "configPath:isolatedConfig",
    "delete original.ai", 'original.ai?.binding,"AI"',
    "wrangler.local-harness.json", "await harness.listen()",
    "await harness.fetch(", "await harness.close()",
    "Refusing programmatic acceptance without disposable local Supabase",
    "FOREMENTION_ISOLATED_APP_URL:url.href",
    "scripts/isolated-customer-api.mjs","result.code,0",
  ])assert.ok(script.includes(required),"Missing strict harness condition: "+required);
  for(const required of [
    "real-change-spec-review-role-gates-and-manager-approval",
    "ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result",
  ])assert.ok(client.includes(required),"Do not weaken actual signed-in journey: "+required);
  for(const required of [
    "supabase start","supabase db reset","pnpm build",
    "node scripts/isolated-programmatic-worker-harness.mjs",
    "supabase stop --no-backup",
  ])assert.ok(workflow.includes(required),"Missing local-only CI gate: "+required);
  for(const forbidden of ["wrangler@4.113.0 dev","secrets.","FOREMENTION_ACCEPTANCE_PASSWORD","https://foremention.com"])
    assert.ok(!workflow.includes(forbidden),"Production or old-dev-proxy coupling is forbidden.");
});
