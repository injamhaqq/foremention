import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("customer analytics reports movement only from the exact comparable evidence pair", async () => {
  const [analytics, intelligence] = await Promise.all([
    text("app/app/analytics/page.tsx"),
    text("lib/intelligence-loop.ts"),
  ]);

  assert.match(analytics, /loadWeeklyIntelligence/);
  assert.match(analytics, /const previous = intelligence\.previous/);
  assert.match(analytics, /same question set, provider, exact model, and methodology/i);
  assert.match(analytics, /only the exact comparable pair above is used for movement/i);
  assert.match(analytics, /Other reviewed collections exist, but none matched/i);
  assert.doesNotMatch(analytics, /Comparable reviewed collection history/);
  assert.doesNotMatch(analytics, /runs\.at\(-2\)/);

  assert.match(intelligence, /function comparisonSignature/);
  assert.match(intelligence, /row\.prompt_key.*row\.provider.*model/s);
  assert.match(intelligence, /candidateSignature === latestSignature/);
  assert.match(intelligence, /same question, provider, exact model, and methodology/i);
});
