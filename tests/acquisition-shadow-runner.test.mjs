import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("shadow workflow is repo-authorized, read-only, and explicitly confirmed", async () => {
  const workflow = await text(".github/workflows/acquisition-shadow-run.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /inputs:\s*\n\s+confirm:/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(workflow, /inputs\.confirm == 'RUN'/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /pull-requests:\s*write/);
});

test("shadow runner invokes only the bounded acquisition function with release idempotency", async () => {
  const source = await text("scripts/invoke-acquisition-shadow.mjs");
  assert.match(source, /APP_ID = "foremention"/);
  assert.match(source, /FUNCTION_ID = "discover-acquisition-targets-shadow"/);
  assert.match(source, /idempotencyKey: `foremention-shadow-\$\{expectedBuild\}`/);
  assert.match(source, /ACQUISITION_SHADOW_CONFIRM_REQUIRED/);
  assert.match(source, /INNGEST_AUTH_TOKEN_UNAVAILABLE/);
  assert.match(source, /MAX_WAIT_MS = 300_000/);
  assert.match(source, /last\.status !== "COMPLETED"/);
});

test("shadow runner never prints or serializes its auth token", async () => {
  const source = await text("scripts/invoke-acquisition-shadow.mjs");
  assert.doesNotMatch(source, /console\.log\([^\n]*authToken/);
  assert.doesNotMatch(source, /JSON\.stringify\([^\n]*authToken/);
  assert.doesNotMatch(source, /process\.env\.INNGEST_AUTH_TOKEN\s*\)/);
});
