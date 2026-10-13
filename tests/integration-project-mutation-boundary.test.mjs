import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("integration routes keep direct mutations inside the active project", async () => {
  const [hubspot, notion, sheets] = await Promise.all([
    text("app/api/integrations/hubspot/route.ts"),
    text("app/api/integrations/notion/route.ts"),
    text("app/api/integrations/google-sheets/route.ts"),
  ]);

  assert.match(
    hubspot,
    /integrations\?id=eq\.\$\{rows\[0\]\.id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    notion,
    /integrations\?id=eq\.\$\{rows\[0\]\.id\}&organization_id=eq\.\$\{current\.context\.organizationId\}&project_id=eq\.\$\{current\.context\.projectId\}/,
  );
  assert.match(
    sheets,
    /integrations\?id=eq\.\$\{rows\[0\]\.id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
});

test("server-side OAuth refresh uses canonical project identity", async () => {
  const [hubspot, sheets] = await Promise.all([
    text("lib/hubspot-connector.ts"),
    text("lib/google-sheets-connector.ts"),
  ]);

  assert.match(hubspot, /project_id: string/);
  assert.match(hubspot, /connected_by: string \| null/);
  assert.match(hubspot, /saveHubSpotConnection\(integration\.organization_id, integration\.project_id, integration\.connected_by, tokens\)/);
  assert.doesNotMatch(hubspot, /configuration\.project_id/);

  assert.match(
    sheets,
    /integrations\?id=eq\.\$\{integration\.id\}&organization_id=eq\.\$\{integration\.organization_id\}&project_id=eq\.\$\{integration\.project_id\}/,
  );
});
