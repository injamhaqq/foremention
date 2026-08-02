import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("any two completed organization-scoped runs can be compared", async () => {
  const page = await readFile(new URL("../app/app/runs/compare/page.tsx", import.meta.url), "utf8");
  const selector = await readFile(new URL("../components/run-comparison-selector.tsx", import.meta.url), "utf8");
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  assert.match(selector, /name="left"/);
  assert.match(selector, /name="right"/);
  assert.match(page, /gainedBrands/);
  assert.match(page, /lostBrands/);
  assert.match(page, /gainedSources/);
  assert.match(page, /lostSources/);
  assert.match(page, /leftConfidence/);
  assert.match(data, /run_id=eq\.\$\{runId\}/);
  assert.match(data, /organization_id=eq\.\$\{organizationId\}/);
});
