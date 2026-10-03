import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Google Sheets export route passes the complete active-project context", async () => {
  const route = await text("app/api/integrations/google-sheets/export/route.ts");

  assert.match(route, /exportDatasetToGoogleSheets\(\{ organizationId: context\.organizationId, projectId: context\.projectId, categoryId: context\.categoryId, token: viewer\.accessToken, name:/);
  assert.doesNotMatch(route, /exportDatasetToGoogleSheets\(context\.organizationId,/);
});

test("Google Sheets export selects only the active project's connected credential", async () => {
  const connector = await text("lib/google-sheets-connector.ts");

  assert.match(
    connector,
    /integrations\?select=id,organization_id,project_id,configuration&organization_id=eq\.\$\{input\.organizationId\}&project_id=eq\.\$\{input\.projectId\}&provider=eq\.google_sheets&status=eq\.connected&limit=1/,
  );
});

test("direct Google Sheets datasets are project-scoped and bounded", async () => {
  const connector = await text("lib/google-sheets-connector.ts");

  assert.match(connector, /prompts\?select=id,prompt_text,intent,active,created_at&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(connector, /runs\?select=id,status,provider_ids,prompt_count,answer_count,citation_count,actual_cost_usd,created_at,completed_at&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(connector, /evidence_items\?select=id,evidence_type,title,source_url,verification_status,observed_at,created_at&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(connector, /MAX_SHEETS_EXPORT_ROWS \+ 1/);
  assert.match(connector, /rows\.length > MAX_SHEETS_EXPORT_ROWS/);
});

test("Source Map export traverses the active project map instead of exporting organization-wide sources", async () => {
  const connector = await text("lib/google-sheets-connector.ts");

  assert.match(connector, /source_maps\?select=id,run:runs!inner\(project_id\)/);
  assert.match(connector, /category_id=eq\.\$\{context\.categoryId\}/);
  assert.match(connector, /run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(connector, /source_map_id=eq\.\$\{maps\[0\]\.id\}/);
  assert.match(connector, /source:sources\(id,canonical_url,domain,page_title,source_type,crawler_access,first_observed_at,last_observed_at\)/);
  assert.doesNotMatch(connector, /sources\?select=id,canonical_url,domain,page_title/);
});

test("Action export reuses fail-closed project placement ownership", async () => {
  const connector = await text("lib/google-sheets-connector.ts");

  assert.match(connector, /loadProjectPlacementScope\(\{/);
  assert.match(connector, /projectId: context\.projectId/);
  assert.match(connector, /placements\?select=id,source_url,page_title,entry_route,stage,updated_at,target_prompt_ids,baseline_run_id,remeasurement_run_id/);
  assert.match(connector, /MAX_PROJECT_PLACEMENTS \+ 1/);
  assert.match(connector, /organizationRows\.length > MAX_PROJECT_PLACEMENTS/);
  assert.match(connector, /filterPlacementsToProject\(organizationRows, scope\)/);
  assert.match(connector, /if \(!scope\) throw new Error/);
});

test("Action export fails closed on mixed, unknown, or unlinked project ownership", async () => {
  const scope = await text("lib/project-placement-scope.ts");

  assert.match(scope, /if \(!hasAnyProjectLink\) return false/);
  assert.match(scope, /!promptIds\.every\(\(id\) => scope\.promptIds\.has\(id\)\)/);
  assert.match(scope, /placement\.baseline_run_id && !scope\.runIds\.has\(placement\.baseline_run_id\)/);
  assert.match(scope, /placement\.remeasurement_run_id && !scope\.runIds\.has\(placement\.remeasurement_run_id\)/);
  assert.doesNotMatch(scope, /placementBelongsToProject\(/);
});
