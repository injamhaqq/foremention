import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("organization-owned notifications derive active-project ownership from durable records", async () => {
  const scope = await text("lib/project-notification-scope.ts");

  assert.match(scope, /MAX_PROJECT_NOTIFICATION_SCAN = 500/);
  assert.match(scope, /run_ready\|run_failed\|source_map_published/);
  assert.match(scope, /reviewed_change:/);
  assert.match(scope, /comment_mention:/);
  assert.match(scope, /workspace-joined:/);
  assert.match(scope, /workspace_comments\?select=id,entity_type,entity_id/);
  assert.match(scope, /evidence_items\?select=id&organization_id=eq\.\$\{encoded\(input\.organizationId\)\}&project_id=eq\.\$\{encoded\(input\.projectId\)\}/);
  assert.match(scope, /source_maps\?select=id,run:runs!inner\(project_id\)/);
  assert.match(scope, /run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/);
  assert.match(scope, /return false;/);
});

test("workspace notification feed filters before grouping or truncating to 50", async () => {
  const data = await text("lib/data.ts");

  assert.match(data, /loadWorkspaceContext\(viewer\)/);
  assert.match(data, /notifications\?select=id,event_key,kind,title,body,href,read_at,created_at/);
  assert.match(data, /limit=\$\{MAX_PROJECT_NOTIFICATION_SCAN \+ 1\}/);
  assert.match(data, /filterNotificationsToProject\(\{/);
  assert.match(data, /projectId: context\.projectId/);
  assert.match(data, /for \(const row of scoped\.slice\(0, 50\)\)/);
});

test("mark-read mutations cannot target sibling-project notifications", async () => {
  const route = await text("app/api/notifications/route.ts");

  assert.match(route, /loadWorkspaceContext\(viewer\)/);
  assert.match(route, /filterNotificationsToProject\(\{/);
  assert.match(route, /projectId: context\.projectId/);
  assert.match(route, /Active-project alert scope could not be proven within the safety bound/);
  assert.match(route, /Alert not found in the active project/);
  assert.match(route, /for \(let index = 0; index < scoped\.length; index \+= 100\)/);
  assert.doesNotMatch(route, /getPrimaryOrganizationId/);
  assert.doesNotMatch(route, /notifications\?organization_id=eq\.\$\{organizationId\}&user_id=eq\.\$\{viewer\.id\}&read_at=is\.null/);
});
