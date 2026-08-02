import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("HubSpot activity delivery is tenant-scoped, encrypted, idempotent, and background-only", () => {
  const connector = read("lib/hubspot-connector.ts");
  const crypto = read("lib/integration-crypto.ts");
  const route = read("app/api/placements/route.ts");
  const migration = read("supabase/migrations/20260802000800_hubspot_activity_connector.sql");
  assert.match(connector, /organization_id=eq\.\$\{input\.organizationId\}/);
  assert.match(connector, /event_key=eq\.\$\{encodeURIComponent\(input\.eventKey\)\}/);
  assert.match(crypto, /AES-GCM/);
  assert.match(route, /foremention\/integration\.hubspot-action/);
  assert.match(migration, /unique \(organization_id, provider, event_key\)/);
  assert.match(migration, /revoke all on public\.integration_credentials from anon, authenticated/);
});

test("HubSpot OAuth is owner-admin authorized and never accepts credentials from the browser", () => {
  const connect = read("app/api/integrations/hubspot/connect/route.ts");
  const callback = read("app/api/integrations/hubspot/callback/route.ts");
  assert.match(connect, /role !== "owner" && role !== "admin"/);
  assert.match(callback, /verifyHubSpotState/);
  assert.doesNotMatch(connect, /access_token|refresh_token/);
});
