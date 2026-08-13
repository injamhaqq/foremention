import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = new URL("../app/api/sources/[id]/review/route.ts", import.meta.url);

test("source review persists the human-reviewed opportunity into the signed-in project", async () => {
  const source = await readFile(route, "utf8");

  assert.match(source, /loadWorkspaceContext\(viewer\)/);
  assert.match(source, /projectId: context\.projectId/);
  assert.match(source, /reviewedOpportunityBridge/);
  assert.match(source, /source_route_id=is\.null/);
  assert.match(source, /method: "POST"[\s\S]*?organization_id: input\.organizationId[\s\S]*?project_id: input\.projectId[\s\S]*?source_id: input\.sourceId/);
  assert.match(source, /influence_score: bridge\.influenceScore/);
  assert.match(source, /feasibility_score: bridge\.feasibilityScore/);
  assert.doesNotMatch(source, /priority_score\s*:/);
});

test("source review refuses an incomplete authenticated session instead of casting away the token boundary", async () => {
  const source = await readFile(route, "utf8");

  assert.match(source, /if \(!viewer\.accessToken\)/);
  assert.match(source, /authenticated session is incomplete/);
  assert.match(source, /status: 401/);
  assert.match(source, /const accessToken = viewer\.accessToken/);
  assert.doesNotMatch(source, /viewer\.accessToken as string/);
});

test("source review archives the persisted gap when the reviewer verifies brand presence", async () => {
  const source = await readFile(route, "utf8");

  assert.match(source, /if \(!bridge\.actionable\)/);
  assert.match(source, /body: \{ status: "archived", title: bridge\.title, next_action: bridge\.nextAction \}/);
  assert.match(source, /opportunity_sync: opportunity/);
});
