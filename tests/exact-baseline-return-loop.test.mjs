import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("customer intelligence routes repeat work through the exact reviewed baseline", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /function exactBaselineHref\(latestRunId: string\)/);
  assert.match(safe, /return `\/app\/runs\/\$\{latestRunId\}`/);
  assert.match(safe, /nextAction\.title === "Repeat the same evidence set"/);
  assert.doesNotMatch(safe, /title:\s*"Repeat the same evidence set/);
  assert.match(safe, /title: "Repeat the same questions and provider when ready"/);
  assert.match(safe, /cta: "Open exact baseline"/);
  assert.match(safe, /href: exactBaselineHref\(latest\.id\)/);
});

test("customer intelligence never implies that a paid comparable rerun is automatically scheduled", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /No automatic schedule is implied/);
  assert.match(safe, /Foremention does not automatically schedule a paid rerun/);
  assert.match(safe, /repeat the exact reviewed questions and provider when a new comparable observation is worth collecting/);
});

test("exact-comparability withholding also sends the customer back to the exact baseline", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  const withheld = safe.match(/function withholdUnsafePair[\s\S]*?\/\*\*/)?.[0] || "";
  assert.match(withheld, /Cross-collection movement withheld/);
  assert.match(withheld, /href: exactBaselineHref\(latest\.id\)/);
  assert.match(withheld, /title: "Repeat the exact reviewed questions and provider"/);
  assert.match(withheld, /cta: "Open exact baseline"/);
});
