import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("comments are tenant-scoped and attach only to verified workspace entities", async () => {
  const [route, migration, sourceEvidence, gaps, evidence] = await Promise.all([
    text("app/api/comments/route.ts"),
    text("supabase/migrations/20260802000700_workspace_comments.sql"),
    text("components/recommendation-source-evidence.tsx"),
    text("components/opportunity-list.tsx"),
    text("components/evidence-manager.tsx"),
  ]);
  assert.match(route, /targetExists/);
  assert.match(route, /organization_id=eq\.\$\{resolved\.context/);
  assert.match(route, /slice\(0, 2000\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /workspace_comments_insert_member/);
  assert.match(sourceEvidence, /entityType="source_map_entry"/);
  assert.match(gaps, /entityType="priority_gap"/);
  assert.match(evidence, /entityType="evidence_item"/);
});
