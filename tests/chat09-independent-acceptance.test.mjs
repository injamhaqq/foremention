import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (path) => readFile(new URL(path, root), "utf8");

test("Chat09 scenarios are explicit, synthetic and never masquerade as successful product tests", async () => {
  const fixture = JSON.parse(await file("tests/attach-v1-09/scenarios.json"));
  assert.equal(fixture.execution_state, "NOT_EXECUTED");
  assert.match(fixture.fixture_policy, /no customer data/);
  assert.ok(fixture.scenarios.length >= 32);
  const required = ["access", "recovery", "project", "questions", "measurement", "evidence", "decision", "interruption", "comparison", "export", "billing", "web", "release", "rollback"];
  for (const stage of required) assert.ok(fixture.scenarios.some((row) => row.stage === stage), "missing acceptance stage: " + stage);
  const ids = new Set();
  for (const item of fixture.scenarios) {
    assert.match(item.id, /^QA09-\d{2}$/);
    assert.ok(!ids.has(item.id), "duplicate fixture ID " + item.id);
    ids.add(item.id);
    assert.equal(item.evidence_status, "NOT_EXECUTED");
    for (const key of ["actor", "action", "expected", "owner", "environment"]) {
      assert.ok(typeof item[key] === "string" && item[key].length > 3, item.id + ": missing " + key);
    }
  }
  assert.ok(fixture.scenarios.some(({ expected }) => /not comparable|no uplift/i.test(expected)));
  assert.ok(fixture.scenarios.some(({ expected }) => /denied/i.test(expected)));
  for (const newId of ["QA09-31", "QA09-32"]) {
    assert.ok(fixture.scenarios.some(({ id }) => id === newId), `missing independent recovery/export case: ${newId}`);
  }
});

test("A04: project-filtering source contracts fail closed on foreign or mixed references", async () => {
  const [scope, refs, pair, regression] = await Promise.all([
    file("lib/project-placement-scope.ts"),
    file("lib/project-source-map-scope.ts"),
    file("lib/run-pair-comparability.ts"),
    file("tests/customer-project-boundary.test.mjs"),
  ]);
  assert.match(scope, /if \(!hasAnyProjectLink\) return false/);
  assert.match(scope, /!promptIds\.every\(\(id\) => scope\.promptIds\.has\(id\)\)/);
  assert.match(scope, /placement\.baseline_run_id && !scope\.runIds\.has\(placement\.baseline_run_id\)/);
  assert.match(scope, /placement\.remeasurement_run_id && !scope\.runIds\.has\(placement\.remeasurement_run_id\)/);
  assert.match(scope, /if \(rows\.length > MAX_PROJECT_PLACEMENTS\) return \[\]/);
  assert.match(refs, /run\.project_id=eq\./);
  assert.match(pair, /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(pair, /Both different runs must belong to the active workspace/);
  assert.match(regression, /direct-id customer mutations prove active-project ownership/);
  assert.match(regression, /cannot mix sibling-project evidence/);
});

test("A16: CI, browser and security workflows are separately PR-triggered (ruleset enforcement requires live API)", async () => {
  const [ci, browser, security] = await Promise.all([
    file(".github/workflows/ci.yml"),
    file(".github/workflows/browser-acceptance.yml"),
    file(".github/workflows/security.yml"),
  ]);
  for (const [name, workflow] of Object.entries({ ci, browser, security })) {
    assert.match(workflow, /\bpull_request:/, name + " must run on PRs");
  }
  assert.match(ci, /scripts\/verify-tenant-isolation\.sql/);
  assert.match(ci, /scripts\/verify-isolated-reviewed-second-cycle\.sql/);
  assert.match(browser, /scripts\/browser-acceptance\.mjs/);
  assert.match(browser, /scripts\/browser-zoom-reflow\.mjs/);
  for (const job of ["dependency-review:", "secrets:", "osv:", "trivy:", "actions-security:"]) {
    assert.ok(security.includes(job), "missing independent security job " + job);
  }
});
