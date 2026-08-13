import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("run inspection withholds movement unless exact reviewed comparability is proven", async () => {
  const page = await text("app/app/runs/compare/page.tsx");
  const selector = await text("components/run-comparison-selector.tsx");
  const gate = await text("lib/run-pair-comparability.ts");

  assert.match(selector, /name="left"/);
  assert.match(selector, /name="right"/);
  assert.match(selector, /Inspect two reviewed collections/);
  assert.doesNotMatch(selector, /Compare any two completed collections/);

  assert.match(page, /assessWorkspaceRunPairComparability/);
  assert.match(page, /Comparison withheld/);
  assert.match(page, /No cross-run delta was calculated/);
  assert.match(page, /assessment\.answers\.filter/);
  assert.match(page, /previous\.brandPresent === false && current\.brandPresent === true/);
  assert.match(page, /previous\.brandPresent === true && current\.brandPresent === false/);
  assert.match(page, /Verified answers/);
  assert.match(page, /Cited answers/);
  assert.doesNotMatch(page, /loadWorkspaceCompetitors|leftConfidence|rightConfidence|Confidence/);
  assert.doesNotMatch(page, /\.7\s*\*\s*100|\.3\s*\*\s*100/);

  assert.match(gate, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(gate, /review_status=eq\.verified/);
  assert.match(gate, /earlier\.methodology_version !== later\.methodology_version/);
  assert.match(gate, /new Date\(earlier\.created_at\)\.getTime\(\) >= new Date\(later\.created_at\)\.getTime\(\)/);
  assert.match(gate, /assessExactQuestionComparability\(laterRunId, earlierRunId, slots\)/);
  assert.match(gate, /canonicalizeEvidenceUrl/);
  assert.doesNotMatch(gate, /answer_text|brand_position/);
});
