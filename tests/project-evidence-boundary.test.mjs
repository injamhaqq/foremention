import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy Source Map and evidence-context loaders use the canonical active-project scope", async () => {
  const [data, scope] = await Promise.all([
    text("lib/data.ts"),
    text("lib/project-source-map-scope.ts"),
  ]);

  assert.match(data, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(data, /organizationId: context\.organizationId/);
  assert.match(data, /projectId: context\.projectId/);
  assert.match(
    scope,
    /source_maps\?select=id,run_id,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/,
  );
  assert.match(data, /run_id=eq\.\$\{map\.runId\}&review_status=eq\.verified/);
  assert.match(data, /run_answer_id=in\.\(\$\{answerIds\.join\(","\)\}\)/);
});

test("question performance and decision signal aggregate only active-project runs", async () => {
  const data = await text("lib/data.ts");

  assert.match(
    data,
    /run_answers\?select=run_id,prompt_key,prompt_text,answer_text,citations_json,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&run\.project_id=eq\.\$\{context\.projectId\}&review_status=eq\.verified/,
  );
  assert.match(data, /export async function loadDecisionSignal[\s\S]*?const context = await loadWorkspaceContext\(viewer\)/);
  assert.match(
    data,
    /runs\?select=id,status,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&status=in\.\(review,complete,partial\)/,
  );
});

test("reviewed change notifications never select a sibling project's current or previous run", async () => {
  const source = await text("lib/reviewed-change-notifications.ts");

  assert.match(
    source,
    /id=eq\.\$\{encodeURIComponent\(runId\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&limit=1/,
  );
  assert.match(
    source,
    /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&id=neq\.\$\{current\.id\}&status=in\.\(complete,partial\)/,
  );
});

test("weekly intelligence and truthful Source Maps use the canonical project-owned map helper", async () => {
  const [intelligence, evidence] = await Promise.all([
    text("lib/intelligence-loop.ts"),
    text("lib/evidence-integrity-data.ts"),
  ]);

  for (const source of [intelligence, evidence]) {
    assert.match(source, /loadLatestProjectSourceMapRef\(\{/);
    assert.match(source, /projectId: context\.projectId/);
  }
  assert.doesNotMatch(
    intelligence,
    /source_maps\?select=id&organization_id=eq\.\$\{context\.organizationId\}&category_id=/,
  );
});
