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
  assert.match(page, /measurement context/i);
  assert.doesNotMatch(page, /loadWorkspaceCompetitors|leftConfidence|rightConfidence|Confidence/);
  assert.doesNotMatch(page, /\.7\s*\*\s*100|\.3\s*\*\s*100/);

  assert.match(gate, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(gate, /review_status=eq\.verified/);
  assert.match(gate, /measurement_context_json/);
  assert.match(gate, /earlier\.methodology_version !== later\.methodology_version/);
  assert.match(gate, /new Date\(earlier\.created_at\)\.getTime\(\) >= new Date\(later\.created_at\)\.getTime\(\)/);
  assert.match(gate, /assessExactQuestionComparability\(laterRunId, earlierRunId, slots\)/);
  assert.match(gate, /canonicalizeEvidenceUrl/);
  assert.doesNotMatch(gate, /answer_text|brand_position/);
});
test("run-pair comparisons cannot leak adjacent projects or invent movement from truncated verified answer sets",async()=>{
  const gate=await text("lib/run-pair-comparability.ts");
  assert.match(gate,/project_id=eq\\.\\$\\{context\\.projectId\\}/);
  assert.match(gate,/runs\\?select=id,status,methodology_version,answer_count,created_at/);
  assert.match(gate,/rows\\.length >= 500/);
  assert.match(gate,/rows\\.filter\\(\\(row\\) => row\\.run_id === run\\.id\\)\\.length === run\\.answer_count/);
  assert.match(gate,/Number\\.isSafeInteger\\(run\\.answer_count\\)/);
  assert.match(gate,/Duplicate verified buyer-question\\/provider slots/);
  assert.match(gate,/Persisted collection creation chronology is unavailable/);
  const retrieve=gate.indexOf("const rows = await supabaseRest");
  const completeness=gate.indexOf("rows.length >= 500");
  const comparability=gate.indexOf("assessExactQuestionComparability(laterRunId, earlierRunId, slots)");
  assert.ok(retrieve>=0 && completeness>retrieve && comparability>completeness,
    "reporting must reject truncation before making an exact-comparability claim");
});
