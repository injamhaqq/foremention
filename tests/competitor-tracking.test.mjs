import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url); const text = (path) => readFile(new URL(path, root), "utf8");
test("competitor tracking uses organization-scoped answer and reviewed-source observations", async () => {
  const [data, route, page, component, nav, bridge] = await Promise.all([text("lib/data.ts"), text("app/api/competitors/route.ts"), text("app/app/competitors/page.tsx"), text("components/competitor-tracker.tsx"), text("components/workspace-navigation.tsx"), text("components/retention-surface-bridge.tsx")]);
  assert.match(data, /loadCompetitorTracking/); assert.match(data, /organization_id=eq\.\$\{context\.organizationId\}/); assert.match(data, /answer_text\.toLocaleLowerCase/); assert.match(data, /sourceOverlap/);
  assert.match(route, /getPrimaryWorkspaceRole/); assert.match(route, /role === "viewer"/); assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(page, /CompetitorTracker/); assert.match(component, /This does not estimate market share/);
  assert.doesNotMatch(nav, /\/app\/competitors/);
  assert.match(bridge, /href="\/app\/competitors"/);
  assert.match(bridge, /Review competitors/);
});