import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { placementBelongsToProject } from "../lib/agent-os/customer-success-core.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("placement project scope is derived only from project-owned prompt and run links", () => {
  const promptIds = new Set(["prompt-a"]);
  const runIds = new Set(["run-a"]);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: ["prompt-a"],
    baseline_run_id: null,
    remeasurement_run_id: null,
  }, promptIds, runIds), true);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: [],
    baseline_run_id: "run-a",
    remeasurement_run_id: null,
  }, promptIds, runIds), true);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: ["prompt-other"],
    baseline_run_id: "run-other",
    remeasurement_run_id: null,
  }, promptIds, runIds), false);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: null,
    baseline_run_id: null,
    remeasurement_run_id: null,
  }, promptIds, runIds), false);
});

test("shared placement scope loader is project-filtered and fails closed on bounded saturation", async () => {
  const scope = await text("lib/project-placement-scope.ts");

  assert.match(scope, /prompts\?select=id&organization_id=eq\.\$\{input\.organizationId\}&project_id=eq\.\$\{input\.projectId\}/);
  assert.match(scope, /runs\?select=id&organization_id=eq\.\$\{input\.organizationId\}&project_id=eq\.\$\{input\.projectId\}/);
  assert.match(scope, /MAX_PROJECT_PLACEMENT_SCOPE_LINKS \+ 1/);
  assert.match(scope, /prompts\.length > MAX_PROJECT_PLACEMENT_SCOPE_LINKS/);
  assert.match(scope, /runs\.length > MAX_PROJECT_PLACEMENT_SCOPE_LINKS/);
  assert.match(scope, /return null/);
  assert.match(scope, /placementBelongsToProject\(placement, scope\.promptIds, scope\.runIds\)/);
  assert.match(scope, /rows\.length > MAX_PROJECT_PLACEMENTS/);
});

test("customer-facing placement reads filter organization-owned rows through active-project links", async () => {
  const data = await text("lib/data.ts");

  assert.match(data, /loadProjectPlacementScope\(/);
  assert.match(data, /projectId: context\.projectId/);
  assert.match(data, /placements\?select=id,source_url,page_title,entry_route,stage,updated_at,target_prompt_ids,baseline_run_id,remeasurement_run_id,owner_id/);
  assert.match(data, /MAX_PROJECT_PLACEMENTS \+ 1/);
  assert.match(data, /filterPlacementsToProject\(rows, scope\)/);
  assert.match(data, /scope\.promptIds\.has\(id\)/);
});

test("Action creation binds the source and baseline run to the active project", async () => {
  const route = await text("app/api/placements/route.ts");

  assert.match(route, /source_maps\?select=id,run_id,run:runs!inner\(project_id\)/);
  assert.match(route, /run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /prompts\?select=id&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /source_map_entries\?select=source_id,source:sources\(canonical_url,page_title\)/);
  assert.match(route, /source_map_id=eq\.\$\{sourceMap\.id\}/);
  assert.match(route, /baseline_run_id: sourceMap\.run_id/);
  assert.match(route, /target_prompt_ids: targetPromptIds/);
  assert.match(route, /active project's reviewed Source Map/);
});

test("Action updates prove project membership before mutation or completion events", async () => {
  const route = await text("app/api/placements/route.ts");

  assert.match(route, /loadProjectPlacementScope\(/);
  assert.match(route, /placements\?select=id,stage,target_prompt_ids,baseline_run_id,remeasurement_run_id/);
  assert.match(route, /placementBelongsToScope\(action, scope\)/);
  assert.match(route, /if \(!action \|\| !placementBelongsToScope/);
  assert.match(route, /placement_id: action\.id/);
  assert.match(route, /action\.completed:\$\{action\.id\}/);
});

test("workspace search and retention reuse project-scoped Actions instead of organization-only placement reads", async () => {
  const [search, attention] = await Promise.all([
    text("lib/workspace-search.ts"),
    text("app/api/retention/attention/route.ts"),
  ]);

  assert.match(search, /loadPlacements\(viewer\)/);
  assert.doesNotMatch(search, /placements\?select=/);

  assert.match(attention, /measurement_schedules\?select=id&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(attention, /loadProjectPlacementScope\(/);
  assert.match(attention, /filterPlacementsToProject\(organizationActions, scope\)/);
  assert.match(attention, /MAX_PROJECT_PLACEMENTS \+ 1/);
});
