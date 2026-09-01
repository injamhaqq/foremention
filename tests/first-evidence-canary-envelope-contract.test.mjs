import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../.github/workflows/first-evidence-canary.yml", import.meta.url), "utf8");

test("authenticated production canary has a bounded twenty-minute polling envelope inside a forty-minute job", () => {
  assert.match(workflow, /timeout-minutes: 40/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_CANARY_TIMEOUT_MS: '1200000'/);
});
