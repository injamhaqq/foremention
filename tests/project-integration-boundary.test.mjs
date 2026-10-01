import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("OAuth state binds project context for all project-owned connectors", async () => {
  const [oauth, hubspot, hubspotConnect, hubspotCallback, sheetsConnect, sheetsCallback, notionConnect, notionCallback] = await Promise.all([
    text("lib/oauth-state.ts"),
    text("lib/hubspot-connector.ts"),
    text("app/api/integrations/hubspot/connect/route.ts"),
    text("app/api/integrations/hubspot/callback/route.ts"),
    text("app/api/integrations/google-sheets/connect/route.ts"),
    text("app/api/integrations/google-sheets/callback/route.ts"),
    text("app/api/integrations/notion/connect/route.ts"),
    text("app/api/integrations/notion/callback/route.ts"),
  ]);

  assert.match(oauth, /projectId: projectId \|\| null/);
  assert.match(oauth, /\(parsed\.projectId \|\| null\) === \(projectId \|\| null\)/);
  assert.match(hubspot, /createHubSpotState\(organizationId: string, projectId: string/);
  assert.match(hubspot, /verifyHubSpotState\(state: string, organizationId: string, projectId: string/);
  assert.match(hubspotConnect, /createHubSpotState\(context\.organizationId, context\.projectId/);
  assert.match(hubspotCallback, /verifyHubSpotState\(state, context\.organizationId, context\.projectId/);
  assert.match(sheetsConnect, /createOAuthState\("google_sheets", context\.organizationId, viewer\.id, [^\n]+, context\.projectId\)/);
  assert.match(sheetsCallback, /verifyOAuthState\(state, "google_sheets", context\.organizationId, viewer\.id, [^\n]+, context\.projectId\)/);
  assert.match(notionConnect, /createOAuthState\("notion", context\.organizationId, viewer\.id, [^\n]+, context\.projectId\)/);
  assert.match(notionCallback, /verifyOAuthState\(state, "notion", context\.organizationId, viewer\.id, [^\n]+, context\.projectId\)/);
});

test("Google Sheets exports use only the active project's connection and evidence", async () => {
  const [connector, route] = await Promise.all([
    text("lib/google-sheets-connector.ts"),
    text("app/api/integrations/google-sheets/export/route.ts"),
  ]);

  assert.match(connector, /exportDatasetToGoogleSheets\(organizationId: string, projectId: string/);
  assert.match(connector, /organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}&provider=eq\.google_sheets/);
  assert.match(connector, /prompts\?select=[^\n]+organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}/);
  assert.match(connector, /runs\?select=[^\n]+organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}/);
  assert.match(connector, /evidence_items\?select=[^\n]+organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}/);
  assert.match(connector, /source_maps\?select=id,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{projectId\}/);
  assert.match(connector, /placementBelongsToProject\(row, promptIds, runIds\)/);
  assert.match(route, /exportDatasetToGoogleSheets\(context\.organizationId, context\.projectId/);
});

test("HubSpot completion delivery requires the Action and connection to share the event project", async () => {
  const [connector, placements, inngest] = await Promise.all([
    text("lib/hubspot-connector.ts"),
    text("app/api/placements/route.ts"),
    text("lib/jobs/inngest.ts"),
  ]);

  assert.match(connector, /projectId: string; placementId: string/);
  assert.match(connector, /project_id=eq\.\$\{input\.projectId\}&provider=eq\.hubspot/);
  assert.match(connector, /loadProjectPlacementScope\(\{ organizationId: input\.organizationId, projectId: input\.projectId, serviceRole: true \}\)/);
  assert.match(connector, /placementBelongsToScope\(placement, scope\)/);
  assert.match(placements, /projectId: context\.projectId, placementId: action\.id/);
  assert.match(inngest, /organizationId: string; projectId: string; placementId: string/);
});

test("Notion manual and weekly digests stay on the seed project's connection and evidence", async () => {
  const [connector, manualRoute, jobs] = await Promise.all([
    text("lib/notion-connector.ts"),
    text("app/api/integrations/notion/export/route.ts"),
    text("lib/jobs/inngest.ts"),
  ]);

  assert.match(connector, /exportWeeklyDigestToNotion\(organizationId: string, projectId: string/);
  assert.match(connector, /organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}&provider=eq\.notion/);
  assert.match(connector, /notion\.weekly_digest:\$\{projectId\}:\$\{weekKey\}/);
  assert.match(connector, /runs\?select=[^\n]+organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{projectId\}/);
  assert.match(connector, /source_maps\?select=id,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{projectId\}/);
  assert.match(manualRoute, /exportWeeklyDigestToNotion\(context\.organizationId, context\.projectId/);
  assert.match(jobs, /exportWeeklyDigestToNotion\(seed\.organization_id, seed\.project_id, weekKey\)/);
});
