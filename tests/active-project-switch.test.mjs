import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active project selection is authorized, server-scoped, and cleared with the session", async () => {
  const [data, route, cookies] = await Promise.all([
    text("lib/data.ts"),
    text("app/api/workspace/project/route.ts"),
    text("lib/session-cookies.ts"),
  ]);

  assert.match(data, /ACTIVE_PROJECT_COOKIE/);
  assert.match(data, /projects\.find\(\(candidate\) => candidate\.id === requestedProjectId\) \|\| projects\[0\]/);
  assert.match(data, /projects\?select=id,name,client_brand,website,category&organization_id=eq\.\$\{organizationId\}&status=eq\.active/);\n  assert.match(data, /projectBrand: row\.client_brand\.trim\(\)/);\n  assert.match(data, /projectBrand: project\.projectBrand/);

  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /getPrimaryOrganizationId/);
  assert.match(route, /projects\?select=id,name&id=eq\.\$\{encodeURIComponent\(projectId\)\}&organization_id=eq\.\$\{organizationId\}&status=eq\.active&limit=1/);
  assert.match(route, /setActiveProjectCookie\(response, project\.id\)/);

  assert.match(cookies, /export const ACTIVE_PROJECT_COOKIE/);
  assert.match(cookies, /httpOnly: true/);
  assert.match(cookies, /sameSite: "lax"/);
  assert.match(cookies, /response\.cookies\.delete\(ACTIVE_PROJECT_COOKIE\)/);
});

test("workspace navigation exposes the active project and hard reloads after a switch", async () => {
  const [navigation, shell, layout] = await Promise.all([
    text("components/workspace-navigation.tsx"),
    text("components/app-shell.tsx"),
    text("app/app/layout.tsx"),
  ]);

  assert.match(navigation, /aria-label="Active project"/);
  assert.match(navigation, /fetch\("\/api\/workspace\/project"/);
  assert.match(navigation, /window\.location\.reload\(\)/);
  assert.match(navigation, /A hard navigation deliberately cancels stale in-flight UI requests/);
  assert.match(shell, /activeProjectId/);
  assert.match(layout, /loadWorkspaceProjects/);
  assert.match(layout, /activeProjectId=\{workspace\?\.projectId\}/);
});
