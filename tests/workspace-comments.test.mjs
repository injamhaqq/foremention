import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("comments authorize every target inside the active project before reading or writing", async () => {
  const [route, scope, migration, sourceEvidence, gaps, evidence] = await Promise.all([
    text("app/api/comments/route.ts"),
    text("lib/project-source-map-scope.ts"),
    text("supabase/migrations/20260802000700_workspace_comments.sql"),
    text("components/recommendation-source-evidence.tsx"),
    text("components/opportunity-list.tsx"),
    text("components/evidence-manager.tsx"),
  ]);

  assert.match(route, /loadProjectSourceMapEntryRef\(\{/);
  assert.match(route, /projectId: context\.projectId/);
  assert.match(route, /categoryId: context\.categoryId/);
  assert.match(
    route,
    /evidence_items\?select=id&id=eq\.\$\{encodeURIComponent\(entityId\)\}&organization_id=eq\.\$\{encodeURIComponent\(context\.organizationId\)\}&project_id=eq\.\$\{encodeURIComponent\(context\.projectId\)\}&limit=1/,
  );
  assert.match(route, /targetExists\(entityType, entityId, context, viewer\.accessToken!\)/);
  assert.match(scope, /run\.project_id=eq\.\$\{encoded\(input\.projectId\)\}/);
  assert.match(route, /organization_id=eq\.\$\{resolved\.context/);
  assert.match(route, /slice\(0, 2000\)/);

  assert.match(migration, /enable row level security/);
  assert.match(migration, /workspace_comments_insert_member/);
  assert.match(sourceEvidence, /entityType="source_map_entry"/);
  assert.match(gaps, /entityType="priority_gap"/);
  assert.match(evidence, /entityType="evidence_item"/);
});
