import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("customer intelligence routes repeat work through the exact reviewed baseline", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /function exactBaselineHref\(latestRunId: string\)/);
  assert.match(safe, /return `\/app\/runs\/\$\{latestRunId\}`/);
  assert.match(safe, /title: "Repeat the same questions and provider"/);
  assert.match(safe, /title: "Open the reviewed baseline"/);
  assert.match(safe, /cta: "Open reviewed baseline"/);
  assert.match(safe, /href: exactBaselineHref\(latest\.id\)/);
});

test("return-loop copy reflects the conditional capped weekly scheduler without guaranteeing recurrence or comparability", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /Eligible workspaces are checked weekly for a capped re-observation/);
  assert.match(safe, /provider configuration, capacity, quota, and spend controls allow it/);
  assert.match(safe, /only when exact question text, provider, model, and methodology remain compatible/);
  assert.doesNotMatch(safe, /does not automatically schedule a paid rerun/i);
  assert.doesNotMatch(safe, /guaranteed weekly/i);
  assert.doesNotMatch(safe, /title:\s*"Run the next scheduled comparison"/);
});

test("withheld movement returns to the reviewed baseline without claiming the next model is fixed", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  const withheld = safe.match(/function withholdUnsafePair[\s\S]*?\/\*\*/)?.[0] || "";
  assert.match(withheld, /Cross-collection movement withheld/);
  assert.match(withheld, /title: "Repeat the same reviewed questions and provider"/);
  assert.match(withheld, /href: exactBaselineHref\(latest\.id\)/);
  assert.match(withheld, /A later trend is comparable only if the persisted question text, provider, exact model, and methodology all match/);
  assert.doesNotMatch(withheld, /same evidence set/);
});
