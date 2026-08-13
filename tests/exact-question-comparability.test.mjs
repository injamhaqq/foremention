import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessExactQuestionComparability } from "../lib/intelligence-comparability.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const pair = [
  { runId: "latest", promptKey: "q1", promptText: "Which platform should a buyer choose?", provider: "groq", model: "compound-mini" },
  { runId: "previous", promptKey: "q1", promptText: "Which platform should a buyer choose?", provider: "groq", model: "compound-mini" },
];

test("exact comparability accepts only the same persisted buyer-question/provider/model matrix", () => {
  assert.deepEqual(assessExactQuestionComparability("latest", "previous", pair), { comparable: true, reason: null });

  const changedQuestion = pair.map((slot) => ({ ...slot }));
  changedQuestion[0].promptText = "Which evidence platform should a buyer choose?";
  assert.equal(assessExactQuestionComparability("latest", "previous", changedQuestion).comparable, false);

  const changedModel = pair.map((slot) => ({ ...slot }));
  changedModel[0].model = "compound-next";
  assert.equal(assessExactQuestionComparability("latest", "previous", changedModel).comparable, false);

  const missingQuestion = pair.map((slot) => ({ ...slot }));
  missingQuestion[1].promptText = null;
  assert.match(assessExactQuestionComparability("latest", "previous", missingQuestion).reason || "", /question text/i);
});

test("safe intelligence uses tenant-scoped verified answers and withholds an unsafe coarse pair", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /loadWeeklyIntelligence\(viewer\)/);
  assert.match(safe, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(safe, /review_status=eq\.verified/);
  assert.match(safe, /assessExactQuestionComparability/);
  assert.match(safe, /previous: null/);
  assert.match(safe, /Cross-collection movement withheld/);
  assert.doesNotMatch(safe, /serviceRole:\s*true/);
});

test("all customer intelligence surfaces use the final exact-question safety gate", async () => {
  const [analytics, page, api] = await Promise.all([
    text("app/app/analytics/page.tsx"),
    text("app/app/intelligence/page.tsx"),
    text("app/api/intelligence/route.ts"),
  ]);
  for (const source of [analytics, page, api]) {
    assert.match(source, /loadSafeWeeklyIntelligence/);
    assert.doesNotMatch(source, /loadWeeklyIntelligence\(viewer\)/);
  }
  assert.match(analytics, /same exact persisted buyer-question text, provider, exact model, and methodology/);
  assert.match(page, /exact persisted buyer-question text, provider, exact model, and methodology/);
});
