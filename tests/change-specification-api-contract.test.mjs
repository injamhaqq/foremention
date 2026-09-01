import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Change Specification route is tenant-scoped and uses canonical states", async () => {
  const route = await text("app/api/change-specifications/route.ts");
  assert.match(route, /loadWorkspaceContext/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /buildSafeChangeSpecificationDraft/);
  assert.match(route, /validateChangeSpecificationForReview/);
  assert.match(route, /isTrustedMutationOrigin/);
  assert.doesNotMatch(route, /serviceRole\s*:\s*true/);
  assert.doesNotMatch(route, /confidence.*\d+%/i);
});

test("create_from_opportunity persists only reviewed evidence snapshots and rolls back partial creation", async () => {
  const route = await text("app/api/change-specifications/route.ts");
  assert.match(route, /create_from_opportunity/);
  assert.match(route, /evidence_items\?/);
  assert.match(route, /source_observations\?/);
  assert.match(route, /verification_status=eq\.verified/);
  assert.match(route, /review_status=eq\.verified/);
  assert.match(route, /change_specification_evidence/);
  assert.match(route, /method:\s*"DELETE"/);
  assert.match(route, /change_specification\.created/);
});

test("review submission validates completeness and decisions are manager-only", async () => {
  const route = await text("app/api/change-specifications/route.ts");
  assert.match(route, /action === "submit"/);
  assert.match(route, /Complete the Change Specification before review\./);
  assert.match(route, /action === "decision"/);
  assert.match(route, /manager\(role\)/);
  assert.match(route, /approved/);
  assert.match(route, /rejected/);
  assert.match(route, /decision_by/);
  assert.match(route, /decision_at/);
});
