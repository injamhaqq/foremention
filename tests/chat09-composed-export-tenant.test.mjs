// Chat09 QA09-33 — composed-candidate acceptance for the Record CSV export.
//
// Why this exists: on a local composition of the attach-v1 worker heads, the
// Chat02 two-tenant export denial test stopped executing because Chat04 added
// a `@/lib/run-manifest` import to `app/api/export/record/[id]/route.ts` that
// the Chat02 harness does not resolve. That hides whether the composed export
// still denies foreign/sibling Records. This test loads the REAL composed
// export route AND the REAL `lib/run-manifest.ts` against the Chat02
// in-memory PostgREST emulator, with synthetic tenants only.
//
// Scope / honesty: deterministic, in-memory, synthetic. It is NOT a staging,
// RLS, authenticated-browser or production receipt. On a branch that does not
// carry the Chat02 harness (e.g. Chat09 alone) the test is SKIPPED, which must
// never be reported as a pass.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const harnessUrl = new URL("tests/attach02-harness.mjs", root);
const routePath = "app/api/export/record/[id]/route.ts";
const composed = existsSync(harnessUrl)
  && existsSync(new URL(routePath, root))
  && readFileSync(new URL(routePath, root), "utf8").includes("@/lib/run-manifest");
const skip = composed ? false : "composed candidate only: needs Chat02 harness + Chat04 manifest-backed export (not present on this ref)";

const LEGACY_COLUMNS = ["record_id", "collection_date", "question", "provider", "model", "review_state", "collected_at", "answer", "returned_reference_count", "returned_references"];
const B_MARKER = "ORG-B-CONFIDENTIAL-QUESTION";

async function setupComposed({ answerText, breakManifest = false } = {}) {
  const h = await import(harnessUrl.href);
  const tables = h.twoTenantTables();
  const [runA1, runA2, runB1] = tables.runs;
  const created = "2026-10-01T00:00:00.000Z";
  for (const run of tables.runs) Object.assign(run, {
    status: "complete", provider_ids: ["synthetic"], prompt_count: breakManifest && run === runA1 ? 2 : 1, answer_count: 1,
    requested_units: 1, estimated_max_cost_usd: 0, actual_cost_usd: 0, methodology_version: "qa09-synthetic-v1",
    created_at: created, started_at: created, completed_at: created,
  });
  for (const project of tables.projects) project.client_brand = `brand-${project.name}`;
  const rowFor = (run) => ({ organization_id: run.organization_id, project_id: run.project_id, run_id: run.id, created_at: created });
  tables.run_prompt_selections = tables.runs.map((run) => ({
    ...rowFor(run), prompt_id: null, prompt_key: `k-${run.id}`, locale: "en-US", market: "global",
    prompt_text: run === runB1 ? B_MARKER : `question for ${run.id}`,
  }));
  tables.run_attempts = tables.runs.map((run) => ({ ...rowFor(run), prompt_key: `k-${run.id}`, provider: "synthetic", model: "m", status: "succeeded", attempt_number: 1 }));
  tables.run_answers = tables.runs.map((run) => ({ ...rowFor(run), prompt_key: `k-${run.id}`, provider: "synthetic", model: "m", collected_at: created, measurement_context_json: {} }));
  tables.prompt_versions = [];

  const db = new h.FakePostgrest(tables, new Map());
  const viewer = { current: null };
  const deps = h.workspaceDeps(db, viewer, { activeProject: new Map([[h.USERS.aAnalyst.id, h.PROJECT_A1]]) });
  if (answerText) {
    const original = deps["@/lib/data"].loadRunAnswers;
    deps["@/lib/data"].loadRunAnswers = async (v, id) => (await original(v, id)).map((row) => ({ ...row, answer: answerText }));
  }
  // The real manifest loader and its only pure dependency, over the same emulator.
  const methodology = h.loadModule("lib/methodology-registry.ts", deps);
  const manifest = h.loadModule("lib/run-manifest.ts", { ...deps, "@/lib/methodology-registry": methodology });
  const route = h.loadModule(routePath, { ...deps, "@/lib/run-manifest": manifest });
  return { h, db, route, runA1, runA2, runB1, as(user) { viewer.current = user ? h.viewerFor(db, user) : null; } };
}

const get = (env, id) => env.route.GET(env.h.request("/api/export/record/x", { method: "GET" }), env.h.params(id));
const parseHeader = (csv) => csv.split("\n")[0].split(",").map((cell) => cell.replace(/^"|"$/g, ""));

test("QA09-33 composed export denies foreign-org and sibling-project Records without leaking them", { skip }, async () => {
  const env = await setupComposed();
  env.as(null);
  assert.equal((await get(env, env.runA1.id)).status, 401);
  env.as(env.h.USERS.aAnalyst);
  for (const run of [env.runB1, env.runA2]) {
    const response = await get(env, run.id);
    assert.equal(response.status, 404, `export of ${run.project_id} must be denied`);
    const body = await response.text();
    assert.doesNotMatch(body, new RegExp(`${run.id}|${B_MARKER}`));
  }
  env.as(env.h.USERS.revoked);
  assert.equal((await get(env, env.runA1.id)).status, 404, "non-member cannot export");
  assert.deepEqual(env.db.calls.filter((call) => call.method !== "GET"), [], "export performs no writes");
});

test("QA09-33 composed export keeps legacy columns, adds scoped provenance and reads only token-bound, org/project-filtered rows", { skip }, async () => {
  const env = await setupComposed();
  env.as(env.h.USERS.aAnalyst);
  const response = await get(env, env.runA1.id);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const csv = await response.text();
  const header = parseHeader(csv);
  assert.deepEqual(header.slice(0, LEGACY_COLUMNS.length), LEGACY_COLUMNS, "original 10 columns stay first and in order");
  for (const column of ["organization_id", "project_id", "methodology_version", "measurement_surface", "comparison_eligibility", "causal_uplift_claim"]) {
    assert.ok(header.includes(column), `missing provenance column ${column}`);
  }
  assert.match(csv, new RegExp(env.h.ORG_A));
  assert.match(csv, new RegExp(env.h.PROJECT_A1));
  assert.match(csv, /qa09-synthetic-v1/);
  assert.match(csv, /not established/i, "export never asserts causal uplift");
  assert.doesNotMatch(csv, new RegExp(`${env.h.ORG_B}|${env.h.PROJECT_B1}|${env.h.PROJECT_A2}|${B_MARKER}|${env.runB1.id}|${env.runA2.id}`));
  const reads = env.db.calls.filter((call) => call.method === "GET");
  assert.ok(reads.length >= 5, "manifest loader actually executed");
  for (const call of reads) {
    assert.equal(call.auth, "user", `${call.resource} must be token-bound, never service-role/anon`);
    assert.match(call.query, new RegExp(`organization_id=eq\\.${env.h.ORG_A}|id=eq\\.${env.h.PROJECT_A1}`), `${call.resource} must be organization-filtered`);
  }
});

test("QA09-33 incomplete manifest degrades to explicit 'unavailable' provenance, never guessed values", { skip }, async () => {
  const env = await setupComposed({ breakManifest: true });
  env.as(env.h.USERS.aAnalyst);
  const response = await get(env, env.runA1.id);
  assert.equal(response.status, 200, "historical evidence export is not blocked by a missing manifest");
  const [headerLine, row] = (await response.text()).split("\n");
  const header = parseHeader(headerLine);
  const cells = row.match(/"(?:[^"]|"")*"/g).map((cell) => cell.slice(1, -1));
  assert.equal(cells.length, header.length);
  for (const column of ["organization_id", "project_id", "methodology_version", "question_version", "question_locale", "measurement_surface"]) {
    assert.equal(cells[header.indexOf(column)], "unavailable", `${column} must be explicitly unavailable`);
  }
});

test("QA09-33 untrusted answer text cannot become a spreadsheet formula in the composed export", { skip }, async () => {
  const env = await setupComposed({ answerText: '=HYPERLINK("https://attacker.example","x")' });
  env.as(env.h.USERS.aAnalyst);
  const csv = await (await get(env, env.runA1.id)).text();
  assert.ok(csv.includes(`"'=HYPERLINK(""https://attacker.example"",""x"")"`), "formula prefix neutralized and quotes escaped");
  assert.ok(!/(^|,)"?=HYPERLINK/m.test(csv), "no raw formula cell");
});
