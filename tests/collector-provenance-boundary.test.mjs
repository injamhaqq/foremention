import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("A11 activation keeps collector-owned source and placement provenance service-only", async () => {
  const activation = await read("scripts/release-gates/FM05-collector-provenance-columns-activation.sql");
  assert.match(activation, /revoke insert, update, delete on table public\.sources from authenticated/);
  assert.match(activation, /revoke update on table public\.placements from authenticated/);
  const sourceGrant = activation.split("on table public.sources to authenticated")[0].split("grant update (").pop();
  for (const forbidden of ["canonical_url", "domain", "organization_id", "first_observed_at", "last_observed_at", "source_type"]) {
    assert.ok(!sourceGrant.includes(forbidden), `collector source column granted to members: ${forbidden}`);
  }
  const placementGrant = activation.split("on table public.placements to authenticated")[0].split("grant update (").pop();
  for (const forbidden of ["source_id", "source_url", "organization_id", "baseline_run_id", "remeasurement_run_id", "target_prompt_ids", "created_by", "first_cited_at", "last_cited_at", "indexed_at"]) {
    assert.ok(!placementGrant.includes(forbidden), `collector placement column granted to members: ${forbidden}`);
  }
  assert.match(placementGrant, /\bstage\b/);
  assert.match(activation, /if current_user <> 'authenticated' then/);
  assert.match(activation, /new\.source_url := v_source\.canonical_url/);
  assert.match(activation, /new\.created_by := auth\.uid\(\)/);
  assert.match(activation, /s\.organization_id = new\.organization_id/);
  assert.doesNotMatch(activation, /revoke[^;]*service_role/i);
});

test("A11 activation stays a release gate, not an auto-applied migration", async () => {
  const files = await readdir(new URL("../supabase/migrations/", import.meta.url));
  for (const file of files) {
    const sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
    assert.ok(!sql.includes("bind_member_placement_provenance"), `activation leaked into migration ${file}`);
  }
});

test("A11 two-tenant, two-project SQL fixture denies every provenance rewrite and runs in CI", async () => {
  const fixture = await read("scripts/verify-collector-provenance-boundary.sql");
  for (const condition of [
    "member rewrote collector source URL",
    "member rewrote collector source observation history",
    "member fabricated a collector source",
    "member deleted a collector source",
    "cross-tenant source inspection write permitted",
    "member rewrote placement source URL",
    "member moved placement baseline to a sibling project run",
    "member rebound placement source",
    "cross-tenant action stage update permitted",
    "member insert forged placement provenance",
    "member bound an action to a cross-tenant source",
    "member created an action in another tenant",
  ]) {
    assert.ok(fixture.includes(condition), `missing SQL denial: ${condition}`);
  }
  assert.match(fixture, /A11 Project A1[\s\S]*A11 Project A2[\s\S]*A11 Project B1/);
  assert.match(fixture, /rollback;\s*$/);
  const ci = await read(".github/workflows/ci.yml");
  const journey = await read(".github/workflows/isolated-authenticated-journey.yml");
  for (const workflow of [ci, journey]) {
    assert.ok(workflow.includes("scripts/release-gates/FM05-collector-provenance-columns-activation.sql"));
  }
  assert.ok(ci.includes("scripts/verify-collector-provenance-boundary.sql"));
  assert.ok(
    ci.indexOf("FM05-collector-provenance-columns-activation.sql") < ci.indexOf("verify-collector-provenance-boundary.sql"),
    "activation must run before its verification",
  );
});

test("Action routes reject non-UUID identifiers before building PostgREST filters", async () => {
  const route = await read("app/api/placements/route.ts");
  assert.match(route, /if \(!UUID\.test\(body\.sourceId\)\)/);
  assert.match(route, /if \(!UUID\.test\(body\.id\)\)/);
  assert.match(route, /requestedPromptIds\.every\(\(id\) => typeof id === "string" && UUID\.test\(id\)\)/);
});

test("Sheets exports and workspace comments stay bound to the active project (#402/#409)", async () => {
  const [connector, exportRoute, comments] = await Promise.all([
    read("lib/google-sheets-connector.ts"),
    read("app/api/integrations/google-sheets/export/route.ts"),
    read("app/api/comments/route.ts"),
  ]);
  assert.match(exportRoute, /projectId: context\.projectId, categoryId: context\.categoryId/);
  assert.match(connector, /&project_id=eq\.\$\{input\.projectId\}&provider=eq\.google_sheets/);
  assert.match(connector, /filterPlacementsToProject\(organizationRows, scope\)/);
  assert.match(comments, /project_id=eq\.\$\{encodeURIComponent\(context\.projectId\)\}/);
  assert.match(comments, /loadProjectSourceMapEntryRef\(\{/);
});
