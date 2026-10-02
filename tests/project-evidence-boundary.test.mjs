import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy Source Map and evidence-context loaders prove active-project ownership", async () => {
  const data = await text("lib/data.ts");

  assert.match(
    data,
    /source_maps\?select=id,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&run\.project_id=eq\.\$\{context\.projectId\}&status=eq\.published/,
  );
  assert.match(
    data,
    /source_map_entries\?select=[^\n]+&organization_id=eq\.\$\{context\.organizationId\}&source_map_id=eq\.\$\{maps\[0\]\.id\}/,
  );
  assert.match(
    data,
    /run_answers\?select=id,prompt_key,prompt_text,provider,model,answer_text,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&run\.project_id=eq\.\$\{context\.projectId\}/,
  );
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

test("weekly intelligence and truthful Source Maps bind maps through their persisted run project", async () => {
  const [intelligence, evidence] = await Promise.all([
    text("lib/intelligence-loop.ts"),
    text("lib/evidence-integrity-data.ts"),
  ]);

  assert.match(
    intelligence,
    /source_maps\?select=id,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&category_id=eq\.\$\{context\.categoryId\}&run\.project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    evidence,
    /source_maps\?select=id,run_id,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&category_id=eq\.\$\{context\.categoryId\}&run\.project_id=eq\.\$\{context\.projectId\}\$\{runFilter\}/,
  );
});
