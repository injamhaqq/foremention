import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path=>readFile(new URL(path,import.meta.url),"utf8");

test("unified isolated proof retains successful native API journey and audits SAME reviewer-owned asset in UI and board",async()=>{
  const [workflow,harness,bridge,baseline]=await Promise.all([
    read("../.github/workflows/isolated-unified-worker-proof.yml"),
    read("../scripts/isolated-programmatic-worker-harness.mjs"),
    read("../scripts/isolated-customer-api-bridge.mjs"),
    read("../scripts/isolated-customer-api.mjs")
  ]);
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/FOREMENTION_ISOLATED_FULL_BRIDGE=1 node scripts\/isolated-programmatic-worker-harness\.mjs/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.match(workflow,/pnpm build/);
  assert.doesNotMatch(workflow,/secrets\.|FOREMENTION_ACCEPTANCE_PASSWORD|https:\/\/foremention\.com/);
  assert.match(harness,/await import\("\.\/isolated-customer-api\.mjs"\)/,"successful original fixture preserved");
  assert.match(harness,/await import\("\.\/isolated-customer-api-bridge\.mjs"\)/,"unified opt-in fixture selected");
  assert.match(harness,/directWorker\.fetch\(input,init\)/);
  assert.match(bridge,/real-change-spec-review-role-gates-and-manager-approval/);
  assert.match(bridge,/ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result/);
  assert.match(bridge,/readSignedInServerPage\(ownerCtx,"\/app\/outcomes"\)/);
  assert.match(bridge,/readSignedInServerPage\(ownerCtx,"\/app\/outcomes\/print"\)/);
  assert.match(bridge,/same-API-owned-verified-decision-chain-visible-only-to-owner-in-ledger-and-board/);
  assert.match(bridge,/same-API-owned-context-drift-suppressed-in-both-authenticated-reports/);
  assert.match(bridge,/evaluationVersion:"synthetic-independent-drift-v2"/);
  assert.match(bridge,/otherPage\.body\.includes\(realAssetTitle\)/);
  assert.match(bridge,/realAssetTitle=record\?\.proposal\?\.title/);
  assert.ok(bridge.includes("return {status:response.status,body,location:response.headers.get"),"uses actual first server response");
  assert.doesNotMatch(bridge,/createRequire|chromium|newPage\(|https?:\/\/(?:api\.openai\.com|www\.bing\.com|foremention\.com)/);
  assert.ok(bridge.length>baseline.length,"unified script adds report proof to unchanged baseline");
});
