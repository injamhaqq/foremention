import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = file => readFile(new URL(file, import.meta.url),"utf8");

test("compiled Worker harness eliminates the wrangler dev proxy without replacing real API assertions",async()=>{
  const [script,workflow,client] = await Promise.all([
    read("../scripts/isolated-programmatic-worker-harness.mjs"),
    read("../.github/workflows/isolated-programmatic-worker.yml"),
    read("../scripts/isolated-customer-api.mjs"),
  ]);
  assert.match(script,/createTestHarness/);
  assert.match(script,/configPath:isolatedConfig/);
  assert.match(script,/delete original.ai/);
  assert.match(script,/original.ai\\?\\.binding,"AI"/);
  assert.match(script,/wrangler.local-harness.json/);
  assert.match(script,/await harness.listen\\(\\)/);
  assert.match(script,/await harness.fetch\\(/);
  assert.match(script,/await harness.close\\(\\)/);
  assert.match(script,/Refusing programmatic acceptance without disposable local Supabase/);
  assert.match(script,/FOREMENTION_ISOLATED_APP_URL:url.href/);
  assert.match(script,/scripts\\/isolated-customer-api.mjs/);
  assert.match(script,/result.code,0/);
  assert.match(client,/real-change-spec-review-role-gates-and-manager-approval/);
  assert.match(client,/ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.match(workflow,/pnpm build/);
  assert.match(workflow,/node scripts\\/isolated-programmatic-worker-harness.mjs/);
  assert.match(workflow,/supabase stop --no-backup/);
  assert.doesNotMatch(workflow,/wrangler@.*dev --local|secrets\\.|FOREMENTION_ACCEPTANCE_PASSWORD|https:\\/\\/foremention\\.com/);
});
