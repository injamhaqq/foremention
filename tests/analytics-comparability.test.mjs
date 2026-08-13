import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("customer analytics reports movement only from the strict comparable evidence pair", async () => {
  const [analytics, truthful, intelligence, api, advanced] = await Promise.all([
    text("app/app/analytics/page.tsx"),
    text("lib/truthful-intelligence.ts"),
    text("lib/intelligence-loop.ts"),
    text("app/api/intelligence/route.ts"),
    text("app/app/intelligence/page.tsx"),
  ]);

  assert.match(analytics, /loadTruthfulWeeklyIntelligence/);
  assert.match(analytics, /const previous = intelligence\.previous/);
  assert.match(analytics, /same question set, provider, exact model, and methodology/i);
  assert.match(analytics, /only the exact comparable pair above is used for movement/i);
  assert.match(analytics, /Other reviewed collections exist, but none matched/i);
  assert.doesNotMatch(analytics, /runs\.at\(-2\)/);

  assert.match(truthful, /findComparablePrior/);
  assert.match(truthful, /status=in\.\(complete,partial\)/);
  assert.match(truthful, /review_status=eq\.verified/);
  assert.match(truthful, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(truthful, /token: viewer\.accessToken/g);
  assert.doesNotMatch(truthful, /serviceRole:\s*true/);
  assert.match(truthful, /persisted buyer-question text, provider, exact model, and methodology/i);

  assert.match(api, /loadTruthfulWeeklyIntelligence/);
  assert.match(advanced, /loadTruthfulWeeklyIntelligence/);

  // The legacy intelligence builder remains available for internal composition,
  // but customer/API consumers must pass through the stricter provenance gate.
  assert.match(intelligence, /function comparisonSignature/);
});
