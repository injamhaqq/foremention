import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("background collection events carry and re-verify project identity", async () => {
  const [jobs, route, dispatcher] = await Promise.all([
    text("lib/jobs/inngest.ts"),
    text("app/api/runs/route.ts"),
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
  ]);

  assert.match(jobs, /projectId: string/);
  assert.match(route, /data: \{ runId, organizationId: context\.organizationId, projectId: context\.projectId \}/);
  assert.match(jobs, /project_id=eq\.\$\{data\.projectId\}/);
  assert.match(jobs, /project_id=eq\.\$\{run\.project_id\}/);
  assert.match(dispatcher, /project_id=not\.is\.null/);
  assert.match(dispatcher, /data: \{ runId: data\.runId, organizationId: data\.organizationId, projectId: data\.projectId \}/);
});

test("weekly job is digest-only and groups evidence by organization plus project", async () => {
  const [jobs, inngestRoute] = await Promise.all([
    text("lib/jobs/inngest.ts"),
    text("app/api/inngest/route.ts"),
  ]);

  assert.match(jobs, /export const scheduleWeeklyWorkspaceDigests = inngest\.createFunction/);
  assert.match(jobs, /const byProject = new Map<string, ScheduledRunSeed>\(\)/);
  assert.match(jobs, /\$\{row\.organization_id\}\\u0000\$\{row\.project_id\}/);
  assert.match(jobs, /exportWeeklyDigestToNotion\(seed\.organization_id, seed\.project_id, weekKey\)/);
  assert.doesNotMatch(jobs, /prepareWeeklyRun/);
  assert.doesNotMatch(jobs, /idempotencyKey = `weekly:/);
  assert.match(inngestRoute, /scheduleWeeklyWorkspaceDigests/);
  assert.doesNotMatch(inngestRoute, /scheduleWeeklyWorkspaceRuns/);
});

test("Notion and HubSpot integrations resolve the exact project before external effects", async () => {
  const [notion, hubspot, placements] = await Promise.all([
    text("lib/notion-connector.ts"),
    text("lib/hubspot-connector.ts"),
    text("app/api/placements/route.ts"),
  ]);

  assert.match(notion, /project_id=eq\.\$\{projectId\}&provider=eq\.notion/);
  assert.match(notion, /runs\?select=id,status,answer_count,citation_count,created_at&organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}/);
  assert.match(notion, /loadLatestProjectSourceMapRef\(\{/);
  assert.match(notion, /integration_id=eq\.\$\{integration\.id\}/);

  assert.match(hubspot, /projectId: string/);
  assert.match(hubspot, /project_id=eq\.\$\{input\.projectId\}&provider=eq\.hubspot/);
  assert.match(hubspot, /loadProjectPlacementScope\(\{/);
  assert.match(hubspot, /serviceRole: true/);
  assert.match(hubspot, /placementBelongsToScope\(placement, scope\)/);

  assert.match(placements, /baseline_run_id: sourceMap\.runId/);
  assert.match(placements, /placementBelongsToScope\(current\[0\], placementScope\)/);
  assert.match(placements, /projectId: context\.projectId/);
});

test("signed webhooks validate and expose project identity", async () => {
  const webhook = await text("lib/workspace-webhooks.ts");

  assert.match(webhook, /projectId: string/);
  assert.match(webhook, /projects\?select=id&id=eq\.\$\{encodeURIComponent\(event\.projectId\)\}&organization_id=eq\.\$\{event\.organizationId\}&status=eq\.active/);
  assert.match(webhook, /project_id: event\.projectId/);
  assert.match(webhook, /data: \{ href: event\.href, project_id: event\.projectId \}/);
});
