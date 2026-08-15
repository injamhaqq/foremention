import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("../components/run-rerun-button.tsx", import.meta.url), "utf8");

test("repeat-run UI never promises longitudinal comparability before the later observation exists", () => {
  assert.doesNotMatch(component, /Comparable run queued/i);
  assert.doesNotMatch(component, /same evidence set/i);
  assert.match(component, /same questions and provider/i);
  assert.match(component, /exact question text, provider, model, and methodology/i);
});

test("repeat-run keeps the existing single-provider controlled collection path", () => {
  assert.match(component, /fetch\("\/api\/runs"/);
  assert.match(component, /"idempotency-key": crypto\.randomUUID\(\)/);
  assert.match(component, /providers: \[provider\]/);
  assert.match(component, /promptIds/);
});
