import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("Stage-0 independent PR gate uses only ephemeral localhost Auth/PostgREST and the canonical parity evaluator",async()=>{
 const [workflow,fixture,env]=await Promise.all([
  read("../.github/workflows/isolated-outcome-evidence.yml"),
  read("../scripts/verify-isolated-outcome-context-auth.mjs"),
  read("../scripts/prepare-isolated-local-env.mjs"),
 ]);
 assert.match(workflow,/name: Isolated Outcome Evidence/);
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/supabase start/);
 assert.match(workflow,/supabase db reset/);
 assert.match(workflow,/node --experimental-strip-types scripts\/verify-isolated-outcome-context-auth\.mjs/);
 assert.match(workflow,/source \.isolated-local-env/);
 assert.match(workflow,/supabase stop --no-backup/);
 assert.match(workflow,/rm -f \.isolated-local-env/);
 assert.doesNotMatch(workflow,/secrets\.|foremention\.com|FOREMENTION_ACCEPTANCE_PASSWORD/);
 assert.match(env,/NEXT_PUBLIC_SUPABASE_URL/);
 assert.match(env,/127\.0\.0\.1/);
 assert.match(fixture,/Refusing to run evidence integration outside the disposable local Supabase test/);
 assert.match(fixture,/auth\/v1\/admin\/users/);
 assert.match(fixture,/auth\/v1\/token\?grant_type=password/);
 assert.match(fixture,/rpc\/complete_onboarding/);
 assert.match(fixture,/review_status=eq\.verified/);
 assert.match(fixture,/evaluateFollowUpContextParity/);
 assert.match(fixture,/scopedRead\(stranger,ownOrg,ownedIds\)/);
 assert.match(fixture,/assert\.equal\(outsider\.answers\.length,0/);
 assert.match(fixture,/evaluationVersion:"changed-evaluator-v2"/);
 assert.match(fixture,/actually persisted single-answer evaluator-version drift/);
 assert.doesNotMatch(fixture,/https?:\/\/(?:api\.openai\.com|www\.bing\.com|foremention\.com|supabase\.com)/);
});
