import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parsePublicScoreAnswers } from "../lib/public-score-answers.mjs";

test("public score parses five numbered answer lines in question order", () => {
  assert.deepEqual(parsePublicScoreAnswers("1. a\n2. b\n3. c\n4. d\n5. e"), ["a", "b", "c", "d", "e"]);
});

test("public score parses five answers collapsed into one paragraph without splitting on citations", () => {
  const text = "1. Smartsheet suits growth [2], GanttPro v2. is simple [7]. 2. Compare Asana [4]. 3. Asana is easy [1]. 4. No shortlist [6]. 5. Wrike scores well [4].";
  assert.deepEqual(parsePublicScoreAnswers(text), [
    "Smartsheet suits growth [2], GanttPro v2. is simple [7].",
    "Compare Asana [4].",
    "Asana is easy [1].",
    "No shortlist [6].",
    "Wrike scores well [4].",
  ]);
});

test("public score still accepts the legacy nested-JSON answer form", () => {
  const legacy = JSON.stringify({ answers: [5, 4, 3, 2, 1].map((n) => ({ question_number: n, answer: `answer ${n}` })) });
  assert.deepEqual(parsePublicScoreAnswers(legacy), ["answer 1", "answer 2", "answer 3", "answer 4", "answer 5"]);
});

test("public score fails closed on truncated, empty, or incomplete provider output", () => {
  for (const value of [":[{", "", "1. a 2. b 3. c", undefined, '{"answers":[{"question_number":1,"answer":"x"}]}']) {
    assert.equal(parsePublicScoreAnswers(value), null);
  }
});

test("grounded Cloudflare calls disable Gemma hidden reasoning so the JSON answer is not empty", () => {
  const source = readFileSync(new URL("../lib/providers/cloudflare.ts", import.meta.url), "utf8");
  assert.match(source, /chat_template_kwargs: \{ enable_thinking: false \}/);
  const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /parsePublicScoreAnswers\(grounded\.answer\)/);
  assert.doesNotMatch(worker, /Return valid JSON only in the form \{"answers"/);
});
