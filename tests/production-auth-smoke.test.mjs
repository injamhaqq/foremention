import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = new URL("../scripts/production-auth-smoke.mjs", import.meta.url);

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

test("production auth smoke verifies reset boundary and post-logout protection", async () => {
  const source = await scriptSource();

  assert.match(source, /\/reset-password/);
  assert.match(source, /\/forgot-password/);
  assert.match(source, /\/api\/auth\/logout/);
  assert.match(source, /Protected app remained accessible after logout/);
});

test("recovery email is opt-in and never requested by the default smoke", async () => {
  const source = await scriptSource();

  assert.match(source, /process\.argv\.includes\("--request-recovery"\)/);
  assert.match(source, /if \(requestRecovery\)/);
});
