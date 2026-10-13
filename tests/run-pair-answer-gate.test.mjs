import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCompleteVerifiedRunPair,
  MAX_VERIFIED_RUN_PAIR_ANSWERS,
  validPairedRunAnswerBudget,
} from "../lib/run-pair-answer-gate.ts";

const context = {
  locale: "en-US",
  market: "global",
  buyerStage: "evaluation",
  promptVersion: "p1",
  parserVersion: "x1",
  retrievalVersion: "r1",
  policyVersion: "q1",
  schemaVersion: "s1",
  evaluationVersion: "e1",
};
const run = (id, answer_count = 1) => ({ id, answer_count });
const answer = (run_id, prompt_key = "q1", provider = "cloudflare") => ({
  run_id,
  prompt_key,
  prompt_text: "Which product should a buyer consider?",
  provider,
  model: "model-1",
  measurement_context_json: context,
});

test("run pair budget requires positive denominators and one sentinel row", () => {
  assert.equal(validPairedRunAnswerBudget(run("a", 1), run("b", 1)).comparable, true);
  assert.equal(validPairedRunAnswerBudget(run("a", 0), run("b", 1)).comparable, false);
  assert.equal(validPairedRunAnswerBudget(run("a", MAX_VERIFIED_RUN_PAIR_ANSWERS - 1), run("b", 1)).comparable, false);
  assert.equal(validPairedRunAnswerBudget(run("a", 1), run("a", 1)).comparable, false);
});

test("complete pair rejects missing duplicate and third-run rows", () => {
  const earlier = run("earlier", 1);
  const later = run("later", 1);
  const good = [answer("earlier"), answer("later")];
  assert.equal(assessCompleteVerifiedRunPair(earlier, later, good).comparable, true);
  assert.equal(assessCompleteVerifiedRunPair(earlier, later, good.slice(0, 1)).comparable, false);
  assert.equal(assessCompleteVerifiedRunPair(earlier, later, [answer("earlier"), answer("third")]).comparable, false);
  assert.equal(
    assessCompleteVerifiedRunPair(run("earlier", 2), run("later", 1), [answer("earlier"), answer("earlier"), answer("later")]).comparable,
    false,
  );
});

test("complete pair requires exact persisted measurement identity", () => {
  const earlier = run("earlier", 1);
  const later = run("later", 1);
  const changed = { ...answer("later"), model: "model-2" };
  assert.equal(assessCompleteVerifiedRunPair(earlier, later, [answer("earlier"), changed]).comparable, false);
});
