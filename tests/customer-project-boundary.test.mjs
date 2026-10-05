import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("core customer records are bound to the active project", async () => {
  const data = await text("lib/data.ts");

  assert.match(data, /runs\?select=id,status,error_summary[^\n]+organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /prompts\?select=id,prompt_key,prompt_text,active,prompt_clusters\(name\)&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /run_attempts\?select=provider,status,completed_at,created_at,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /run_answers\?select=provider,brand_present,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /run_answers\?select=id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /ai_cost_events\?select=provider,model,input_tokens,output_tokens,total_tokens,estimated_cost_usd,cost_source,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /prompt_clusters\?select=id&organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{project\.id\}/);
  assert.match(data, /categories\?select=id,name&organization_id=eq\.\$\{organizationId\}&active=eq\.true&order=created_at\.asc&limit=100/);
  assert.match(data, /categories\.find\(\(candidate\) => candidate\.name\.trim\(\)\.toLocaleLowerCase\(\) === projectCategory\.toLocaleLowerCase\(\)\)/);
});

test("legacy Source Maps and Actions fail closed on active-project ownership", async () => {
  const [data, sourceScope, placementScope] = await Promise.all([
    text("lib/data.ts"),
    text("lib/project-source-map-scope.ts"),
    text("lib/project-placement-scope.ts"),
  ]);

  assert.match(data, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(data, /projectId: context\.projectId/);
  assert.match(sourceScope, /source_maps\?select=id,run_id,run:runs!inner\(project_id\)/);
  assert.match(sourceScope, /run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/);

  assert.match(data, /loadProjectPlacementScope\(\{/);
  assert.match(data, /filterPlacementsToProject\(organizationRows, scope\)/);
  assert.match(data, /organizationRows\.length > MAX_PROJECT_PLACEMENTS/);
  assert.match(placementScope, /if \(!hasAnyProjectLink\) return false/);
  assert.match(placementScope, /!promptIds\.every\(\(id\) => scope\.promptIds\.has\(id\)\)/);
});

test("direct-id customer mutations prove active-project ownership", async () => {
  const [prompts, runs, cancel, review, inspect, sourceReview] = await Promise.all([
    text("app/api/prompts/route.ts"),
    text("app/api/runs/route.ts"),
    text("app/api/runs/[id]/route.ts"),
    text("app/api/runs/[id]/review/route.ts"),
    text("app/api/sources/[id]/inspect/route.ts"),
    text("app/api/sources/[id]/review/route.ts"),
  ]);

  assert.match(prompts, /prompts\?select=id&id=eq\.\$\{id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(runs, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&idempotency_key=eq/);
  assert.match(runs, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&active_request_key=eq/);
  assert.match(cancel, /runs\?select=id,status,started_at&id=eq\.\$\{id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(review, /project_id=eq\.\$\{context\.projectId\}&limit=1/);
  assert.match(inspect, /loadProjectSourceMapEntryRef\(\{/);
  assert.match(sourceReview, /loadProjectSourceMapEntryRef\(\{/);
});

test("comparison and global-search surfaces cannot mix sibling-project evidence", async () => {
  const [pair, notifications, evidence, intelligence, search, sourceScope] = await Promise.all([
    text("lib/run-pair-comparability.ts"),
    text("lib/reviewed-change-notifications.ts"),
    text("lib/evidence-integrity-data.ts"),
    text("lib/intelligence-loop.ts"),
    text("lib/workspace-search.ts"),
    text("lib/project-source-map-scope.ts"),
  ]);

  assert.match(pair, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&id=in/);
  assert.match(notifications, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&id=neq/);
  assert.match(evidence, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(sourceScope, /run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/);
  assert.match(intelligence, /loadLatestProjectSourceMapRef\(\{/);

  assert.match(search, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(search, /loadProjectPlacementScope\(\{/);
  assert.match(search, /source_map_id=eq\.\$\{sourceMap\.id\}/);
  assert.match(search, /filterPlacementsToProject\(actions \|\| \[\], placementScope\)/);
  assert.doesNotMatch(search, /sources\?select=id,domain,page_title,canonical_url/);
});
