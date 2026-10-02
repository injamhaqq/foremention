import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("canonical Source Map scope resolves published maps through active-project runs", async () => {
  const scope = await text("lib/project-source-map-scope.ts");

  assert.match(scope, /source_maps\?select=id,run_id,run:runs!inner\(project_id\)/);
  assert.match(scope, /run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/);
  assert.match(scope, /status=eq\.published/);
  assert.match(scope, /source_map_entries\?select=id,source_id,source_map_id&id=eq\.\$\{encoded\(input\.entryId\)\}/);
  assert.match(scope, /id=eq\.\$\{encoded\(entry\.source_map_id\)\}/);
  assert.match(scope, /map\.run\?\.project_id !== input\.projectId/);
});

test("generic and truthful Source Map reads use the same project scope", async () => {
  const [data, integrity, intelligence] = await Promise.all([
    text("lib/data.ts"),
    text("lib/evidence-integrity-data.ts"),
    text("lib/intelligence-loop.ts"),
  ]);

  assert.match(data, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(data, /projectId: context\.projectId/);
  assert.match(integrity, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(integrity, /projectId: context\.projectId/);
  assert.match(intelligence, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(intelligence, /projectId: context\.projectId/);
  assert.doesNotMatch(intelligence, /source_maps\?select=id&organization_id=eq\.\$\{context\.organizationId\}&category_id=/);
});

test("source evidence excerpts are rebuilt only from the active project's map run", async () => {
  const [data, overview] = await Promise.all([
    text("lib/data.ts"),
    text("app/app/page.tsx"),
  ]);

  assert.match(data, /options:\s*\{\s*runId\?: string \| null\s*\}\s*=\s*\{\}/);
  assert.match(data, /runId:\s*options\.runId\s*\|\|\s*null/);
  assert.match(data, /run_id=eq\.\$\{map\.runId\}&review_status=eq\.verified/);
  assert.match(data, /run_answer_id=in\.\(\$\{answerIds\.join\(","\)\}\)/);
  assert.match(data, /limit=501/);
  assert.match(data, /answers\.length > 500/);
  assert.match(data, /observations\.length > 500/);
  assert.match(overview, /loadSourceEvidenceContexts\([\s\S]*\{\s*runId:\s*latest\?\.id\s*\|\|\s*null\s*\}\)/);
});

test("source review and inspection reject entries outside active-project Source Maps", async () => {
  const [review, inspect] = await Promise.all([
    text("app/api/sources/[id]/review/route.ts"),
    text("app/api/sources/[id]/inspect/route.ts"),
  ]);

  for (const route of [review, inspect]) {
    assert.match(route, /loadProjectSourceMapEntryRef\(\{/);
    assert.match(route, /projectId: context\.projectId/);
    assert.match(route, /categoryId: context\.categoryId/);
    assert.match(route, /Source record not found in the active project/);
  }
  assert.match(review, /source_map_id=eq\.\$\{entry\.source_map_id\}/);
});

test("workspace search sources and reviewed gaps come from the truthful active-project Source Map", async () => {
  const search = await text("lib/workspace-search.ts");

  assert.match(search, /const sourceMapPromise = loadTruthfulSourceMap\(viewer\)/);
  assert.match(search, /attempt\("Source", sourceMapPromise\)/);
  assert.match(search, /attempt\("Opportunity", sourceMapPromise\)/);
  assert.doesNotMatch(search, /attempt\("Source", supabaseRest/);
  assert.doesNotMatch(search, /attempt\("Opportunity", supabaseRest/);
  assert.match(search, /if \(!item\.reviewedAt \|\| item\.clientPresent\) return false/);
});

test("reviewed change notifications select current and previous runs only inside the active project", async () => {
  const changes = await text("lib/reviewed-change-notifications.ts");

  assert.match(changes, /id=eq\.\$\{encodeURIComponent\(runId\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(changes, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&id=neq\.\$\{current\.id\}/);
});
