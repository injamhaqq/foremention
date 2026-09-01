import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessExactQuestionComparability } from "../lib/intelligence-comparability.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const measurementContext = {
  locale: "en-US",
  market: "US",
  buyerStage: "consideration",
  promptVersion: "provider-prompts.2026-08-30.1",
  parserVersion: "provider-adapters.2026-08-30.1",
  retrievalVersion: "returned-references.2026-08-30.1",
  policyVersion: "recommendation-quality.2026-08-30.1",
  schemaVersion: "recommendation-record.2026-08-30.1",
  evaluationVersion: "ai-evaluation.2026-08-30.1",
};
const pair = [
  { runId: "latest", promptKey: "q1", promptText: "Which platform should a buyer choose?", provider: "groq", model: "compound-mini", measurementContext },
  { runId: "previous", promptKey: "q1", promptText: "Which platform should a buyer choose?", provider: "groq", model: "compound-mini", measurementContext },
];

test("exact comparability accepts only the same persisted question/provider/model/measurement matrix", () => {
  assert.deepEqual(assessExactQuestionComparability("latest", "previous", pair), { comparable: true, reason: null });

  const changedQuestion = pair.map((slot) => ({ ...slot }));
  changedQuestion[0].promptText = "Which evidence platform should a buyer choose?";
  assert.equal(assessExactQuestionComparability("latest", "previous", changedQuestion).comparable, false);

  const changedModel = pair.map((slot) => ({ ...slot }));
  changedModel[0].model = "compound-next";
  assert.equal(assessExactQuestionComparability("latest", "previous", changedModel).comparable, false);

  const changedLocale = pair.map((slot) => ({ ...slot, measurementContext: { ...slot.measurementContext } }));
  changedLocale[0].measurementContext.locale = "en-GB";
  assert.match(assessExactQuestionComparability("latest", "previous", changedLocale).reason || "", /measurement|locale/i);

  const changedMarket = pair.map((slot) => ({ ...slot, measurementContext: { ...slot.measurementContext } }));
  changedMarket[0].measurementContext.market = "GB";
  assert.match(assessExactQuestionComparability("latest", "previous", changedMarket).reason || "", /measurement|market/i);

  const changedParser = pair.map((slot) => ({ ...slot, measurementContext: { ...slot.measurementContext } }));
  changedParser[0].measurementContext.parserVersion = "provider-adapters.2026-09-01.1";
  assert.match(assessExactQuestionComparability("latest", "previous", changedParser).reason || "", /measurement|version/i);

  const missingQuestion = pair.map((slot) => ({ ...slot }));
  missingQuestion[1].promptText = null;
  assert.match(assessExactQuestionComparability("latest", "previous", missingQuestion).reason || "", /question text/i);

  const missingContext = pair.map((slot) => ({ ...slot }));
  missingContext[1].measurementContext = null;
  assert.match(assessExactQuestionComparability("latest", "previous", missingContext).reason || "", /measurement context/i);
});

test("safe intelligence uses tenant-scoped verified answers and full measurement provenance", async () => {
  const safe = await text("lib/safe-intelligence.ts");
  assert.match(safe, /loadWeeklyIntelligence\(viewer\)/);
  assert.match(safe, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(safe, /review_status=eq\.verified/);
  assert.match(safe, /measurement_context_json/);
  assert.match(safe, /assessExactQuestionComparability/);
  assert.match(safe, /previous: null/);
  assert.match(safe, /Cross-collection movement withheld/);
  assert.match(safe, /locale.*market|market.*locale/is);
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
  assert.match(analytics, /exact persisted buyer-question text.*provider.*model.*methodology/is);
  assert.match(page, /exact persisted buyer-question text.*provider.*model.*methodology.*measurement context/is);
});