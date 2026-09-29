import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=(path)=>readFile(new URL(path,import.meta.url),"utf8");

test("mandatory independent full customer API workflow uses production-built local Worker and zero remote secrets",async()=>{
  const [workflow,api,ui]=await Promise.all([
    read("../.github/workflows/isolated-customer-apis.yml"),
    read("../scripts/isolated-customer-api.mjs"),
    read("../.github/workflows/isolated-outcome-ui.yml"),
  ]);
  assert.match(workflow,/pull_request:/);
  assert.doesNotMatch(workflow,/run-isolated-full-journey|if:.*labels/);
  assert.match(workflow,/pnpm build/);
  assert.match(workflow,/pnpm dlx wrangler@4\.113\.0 dev --local/);
  assert.match(workflow,/node scripts\/isolated-customer-api\.mjs/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.match(workflow,/supabase stop --no-backup/);
  assert.doesNotMatch(workflow,/secrets\.|FOREMENTION_ACCEPTANCE_PASSWORD|https:\/\/foremention\.com/);
  assert.match(ui,/FOREMENTION_TEST_UI/,"a separate required real signed-in Outcome UI test must remain");
  assert.match(api,/Refusing any non-local authenticated acceptance target/);
  assert.match(api,/LocalContext/);
  assert.match(api,/new URL\("\/api\/resolutions",app\)/);
  assert.match(api,/real-change-spec-review-role-gates-and-manager-approval/);
  assert.match(api,/ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result/);
  assert.match(api,/cross-tenant answer must be absent/);
  assert.match(api,/native-local HTTP stages/);
  assert.doesNotMatch(api,/createRequire|chromium|newPage\(|https?:\/\/(?:api\.openai\.com|www\.bing\.com|foremention\.com)/);
});
