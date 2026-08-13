import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const scriptPath = new URL("scripts/production-auth-smoke.mjs", root);
const workflowPath = new URL(".github/workflows/ci.yml", root);

async function scriptSource() {
  return readFile(scriptPath, "utf8");
}

test("production auth smoke reads disposable credentials only from environment", async () => {
  const source = await scriptSource();

  assert.match(source, /process\.env\.FOREMENTION_ACCEPTANCE_EMAIL/);
  assert.match(source, /process\.env\.FOREMENTION_ACCEPTANCE_PASSWORD/);
  assert.doesNotMatch(source, /foremention2026\+acceptance/i);
  assert.doesNotMatch(source, /Fm!Acceptance/i);
});

test("production auth smoke verifies exact release provenance and public auth boundaries", async () => {
  const source = await scriptSource();

  assert.match(source, /process\.env\.FOREMENTION_EXPECTED_BUILD_COMMIT/);
  assert.match(source, /buildCommit === expectedBuildCommit/);
  assert.match(source, /Production release did not converge to the expected Git commit/);
  assert.match(source, /Protected app was accessible without authentication/);
  assert.match(source, /\/reset-password/);
  assert.match(source, /\/forgot-password/);
  assert.match(source, /\/api\/auth\/logout/);
  assert.match(source, /Protected app remained accessible after logout/);
});

test("release convergence wait is bounded", async () => {
  const source = await scriptSource();

  assert.match(source, /FOREMENTION_RELEASE_WAIT_SECONDS/);
  assert.match(source, /Math\.min\(300/);
  assert.match(source, /await sleep\(2_000\)/);
});

test("recovery email is opt-in and never requested by the default smoke", async () => {
  const source = await scriptSource();

  assert.match(source, /process\.argv\.includes\("--request-recovery"\)/);
  assert.match(source, /if \(requestRecovery\)/);
});

test("main CI verifies the exact Cloudflare release instead of calling artifact upload a deployment", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /Archive verified build/);
  assert.match(workflow, /Verify exact Cloudflare production release/);
  assert.match(workflow, /FOREMENTION_EXPECTED_BUILD_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /node scripts\/production-auth-smoke\.mjs/);
  assert.doesNotMatch(workflow, /name: Upload production build/);
});
