import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("outcome states describe observed direction without judging business improvement", async () => {
  const ledger = await text("lib/outcome-ledger.ts");
  assert.match(ledger, /"higher_observed"/);
  assert.match(ledger, /"lower_observed"/);
  assert.match(ledger, /"mixed_observed"/);
  assert.match(ledger, /"no_directional_change"/);
  assert.doesNotMatch(ledger, /OutcomeState = [^\n]*"improved"/);
  assert.doesNotMatch(ledger, /OutcomeState = [^\n]*"regressed"/);
});

test("value reporting uses neutral directional language", async () => {
  const report = await text("lib/value-report.ts");
  assert.match(report, /higherObserved/);
  assert.match(report, /lowerObserved/);
  assert.doesNotMatch(report, /improvementsObserved|regressionsObserved/);
  assert.doesNotMatch(report, /eligible improvement|eligible regression/i);
});

test("customer-facing outcome views do not label directional movement improved or regressed", async () => {
  const [page, print] = await Promise.all([
    text("app/app/outcomes/page.tsx"),
    text("app/app/outcomes/print/page.tsx"),
  ]);
  for (const source of [page, print]) {
    assert.doesNotMatch(source, /Improvements observed|Regressions observed|\bimproved\b|\bregressed\b/i);
  }
});
