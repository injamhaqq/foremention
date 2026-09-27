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
 assert.match(route,/isolatedResolutionReadStage\("entry"\)/);
 assert.match(route,/isolatedResolutionReadStage\("workspace"\)/);
 assert.match(route,/isolatedResolutionReadStage\("loaded"\)/);
 assert.match(route,/isolatedResolutionReadStage\("catch"\)/);
 assert.match(summarizer,/isolated-resolution-read-stage/);
 const helper=route.slice(route.indexOf("function isolatedResolutionReadStage("),
                         route.indexOf("export async function GET()"));
 assert.doesNotMatch(helper,/viewer\.id|accessToken|source_url|JSON\.stringify|process\.env\.SUPABASE/);
});
