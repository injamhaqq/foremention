import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("required PR evidence workflow executes real local Auth/PostgREST with strict cleanup and no prod secrets",async()=>{
 const [required,manual,script]=await Promise.all([
  read("../.github/workflows/isolated-outcome-evidence.yml"),
  read("../.github/workflows/isolated-authenticated-journey.yml"),
  read("../scripts/verify-isolated-outcome-context-auth.mjs"),
 ]);
 assert.match(required,/name: Isolated Outcome Evidence/);
 assert.match(required,/pull_request:/);
 assert.match(required,/supabase start/);
 assert.match(required,/supabase db reset/);
 assert.match(required,/node --experimental-strip-types scripts\/verify-isolated-outcome-context-auth\.mjs/);
 assert.match(required,/source \.isolated-local-env/);
 assert.match(required,/supabase stop --no-backup/);
 assert.match(required,/rm -f \.isolated-local-env/);
 assert.doesNotMatch(required,/secrets\.|foremention\.com|FOREMENTION_ACCEPTANCE_PASSWORD/);
 assert.match(manual,/workflow_dispatch:/);
 assert.doesNotMatch(manual,/\bpull_request:/);
 assert.match(manual,/node scripts\/isolated-authenticated-journey\.mjs/);
 assert.match(script,/Refusing to run evidence integration outside the disposable local Supabase test/);
 assert.match(script,/auth\/v1\/admin\/users/);
 assert.match(script,/auth\/v1\/token\?grant_type=password/);
 assert.match(script,/rpc\/complete_onboarding/);
 assert.match(script,/review_status=eq\.verified/);
 assert.match(script,/evaluateFollowUpContextParity/);
 assert.match(script,/new Set\(\["127\.0\.0\.1","localhost"\]\)/);
 assert.match(script,/actual.*persisted|actually persisted|persisted.*single-answer/i);
 assert.match(script,/stranger\.token/);
 assert.match(script,/assert\.equal\(outsider\.answers\.length,0/);
 assert.match(script,/evaluationVersion:"changed-evaluator-v2"/);
 assert.doesNotMatch(script,/https?:\/\/(?:api\.openai\.com|www\.bing\.com|foremention\.com|supabase\.com)/);
});
