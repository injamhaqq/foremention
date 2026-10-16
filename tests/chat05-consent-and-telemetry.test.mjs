import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sanitizeProductAnalyticsEvent} from "../lib/product-analytics-contract.ts";
test("Chat05 optional experience scripts require opt-in and reload after revoke",async()=>{
 const src=await readFile(new URL("../components/contentsquare-analytics.tsx",import.meta.url),"utf8");
 assert.match(src,/consent !== "accepted" \|\| !tagUrl/);
 assert.match(src,/consent !== "accepted" \|\| !clarityProjectId/);
 assert.match(src,/window\.location\.reload\(\)/);
});
test("Chat05 telemetry drops private text and secret properties",()=>{
 const output=sanitizeProductAnalyticsEvent("workflow_started",{
  provider:"openai",cycle_type:"repeat",question_count:2,
  prompt:"private",email:"person@example.test",access_token:"secret",nested:{secret:true}
 });
 assert.equal(output?.properties.provider,"openai");
 for(const k of ["prompt","email","access_token","nested"])
  assert.equal(Object.hasOwn(output?.properties||{},k),false);
});