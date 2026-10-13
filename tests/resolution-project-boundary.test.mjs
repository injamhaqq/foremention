import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Resolution Center scopes durable evidence and follow-ups to the active project", async () => {
  const route = await text("app/api/resolutions/route.ts");

  assert.match(route, /resolution_asset_evidence\?select=[^\n]+organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /resolution_follow_ups\?select=[^\n]+organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /resolution_follow_ups\?id=eq\.\$\{followUp\.id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
});

test("Resolution Center withholds derived evidence when the bounded observation read saturates", async () => {
  const route = await text("app/api/resolutions/route.ts");

  assert.match(route, /MAX_RESOLUTION_SOURCE_OBSERVATIONS = 500/);
  assert.match(route, /limit=\$\{MAX_RESOLUTION_SOURCE_OBSERVATIONS \+ 1\}/);
  assert.match(route, /observationRows\.length <= MAX_RESOLUTION_SOURCE_OBSERVATIONS \? observationRows : \[\]/);
  assert.doesNotMatch(route, /source_observations\?select=id,source_id,run_answer_id,provider,observed_at[^\n]+limit=500/);
});

test("Resolution follow-up creation and attachment remain project-bound", async () => {
  const route = await text("app/api/resolutions/route.ts");

  assert.match(route, /body: \{ organization_id: context\.organizationId, project_id: context\.projectId, resolution_asset_id: asset\.id/);
  assert.match(route, /resolution_follow_ups\?select=[^\n]+resolution_asset_id=eq\.\$\{asset\.id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /runs\?select=[^\n]+project_id=eq\.\$\{context\.projectId\}/);
});
