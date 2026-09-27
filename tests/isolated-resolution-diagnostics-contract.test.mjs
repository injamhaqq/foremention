import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("isolated GET phase traces are fixed-label and strictly disabled unless disposable CI opts in",async()=>{
 const [route,env,summarizer]=await Promise.all([
  read("../app/api/resolutions/route.ts"),
  read("../scripts/prepare-isolated-local-env.mjs"),
  read("../scripts/summarize-isolated-worker-failure.mjs"),
 ]);
 assert.match(route,/process\.env\.FOREMENTION_ISOLATED_JOURNEY_DIAGNOSTICS === "1"/);
 assert.match(env,/FOREMENTION_ISOLATED_JOURNEY_DIAGNOSTICS:"1"/);
 assert.match(route,/stage: "entry" \| "viewer" \| "workspace" \| "loaded" \| "catch"/);
 assert.match(route,/isolatedResolutionReadStage\("entry", finalProbe, postReviewProbe\)/);
 assert.match(route,/isolatedResolutionReadStage\("workspace", finalProbe, postReviewProbe\)/);
 assert.match(route,/isolatedResolutionReadStage\("loaded", finalProbe, postReviewProbe\)/);
 assert.match(route,/isolatedResolutionReadStage\("catch", finalProbe, postReviewProbe\)/);
 assert.match(summarizer,/isolated-resolution-read-stage/);
 assert.match(summarizer,/isolated-final-resolution-read-stage/);
 assert.match(summarizer,/isolated-post-review-resolution-read-stage/);
 assert.match(route,/request\.headers\.get\("x-foremention-isolated-post-review-read"\)/);
 assert.match(route,/request\.headers\.get\("x-foremention-isolated-final-read"\)/);
 const helper=route.slice(route.indexOf("function isolatedResolutionReadStage("),
                         route.indexOf("export async function GET(request: Request)"));
 assert.doesNotMatch(helper,/viewer\.id|accessToken|source_url|JSON\.stringify|process\.env\.SUPABASE/);
});
