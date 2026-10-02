import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validPairedRunAnswerBudget,
  assessCompleteVerifiedRunPair,
} from "../lib/run-pair-answer-gate.ts";

const before = { id: "first-run", answer_count: 2 };
const after = { id: "second-run", answer_count: 2 };
const context = {
  locale: "en-US", market: "US", buyerStage: "consideration",
  promptVersion: "question-v1", parserVersion: "parser-v1",
  retrievalVersion: "retrieval-v1", policyVersion: "policy-v1",
  schemaVersion: "schema-v1", evaluationVersion: "evaluation-v1",
};
const a = (run_id, prompt_key, extra = {}) => ({
  run_id, prompt_key, prompt_text: "Which provider for " + prompt_key + "?",
  provider: "cloudflare", model: "pinned-model",
  measurement_context_json: context, ...extra,
});
const full = [
  a(before.id, "q1"), a(before.id, "q2"),
  a(after.id, "q1"), a(after.id, "q2"),
];

test("a matching subset from a two-question original is insufficient for an AI change graph", () => {
  const subset = [a(before.id, "q1"), a(after.id, "q1")];
  assert.equal(validPairedRunAnswerBudget(before, after).comparable, true);
  assert.equal(assessCompleteVerifiedRunPair(before, after, subset).comparable, false);
  assert.equal(assessCompleteVerifiedRunPair(before, after, full).comparable, true);
});

test("the full-run gate independently rejects duplicated and contradictory verified-answer evidence", () => {
  for (const rows of [
    [a(before.id, "q1"), a(before.id, "q1"), a(after.id, "q1"), a(after.id, "q2")],
    [a(before.id, "q1"), a(before.id, "q2"), a(after.id, "q1"), a(after.id, "q2", {
      measurement_context_json: { ...context, retrievalVersion: "retrieval-v2" },
    })],
    [...full, a("third-unscoped-run", "q3")],
  ]) {
    assert.equal(assessCompleteVerifiedRunPair(before, after, rows).comparable, false);
  }
});

test("the real graph loader guards independent complete terminal pairs before fetching source-map and creating events", async () => {
  const loader = await readFile(new URL("../lib/ai-observation-change.ts", import.meta.url), "utf8");
  assert.match(loader, /select=id,project_id,status,answer_count,methodology_version,created_at/);
  assert.match(loader, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(loader, /validPairedRunAnswerBudget\(previous, latest\)/);
  assert.match(loader, /assessCompleteVerifiedRunPair\(previous, latest, answers\)/);
  assert.match(loader, /status\)/);
  assert.match(loader, /previousTime >= latestTime/);
  assert.match(loader, /latest\.methodology_version !== previous\.methodology_version/);
  assert.match(loader, /run_answers\?select=/);
  assert.match(loader, /review_status=eq\.verified&order=collected_at\.asc&limit=501/);
  assert.match(loader, /if \(!completeness\.comparable\)/);
  const budget = loader.indexOf("const answerBudget = validPairedRunAnswerBudget(");
  const fetch = loader.indexOf("const answers = await supabaseRest<AnswerRow[]>(");
  const validated = loader.indexOf("const completeness = assessCompleteVerifiedRunPair(");
  const graph = loader.indexOf("const graph = buildAiObservationChangeGraph(");
  assert.ok(budget >= 0 && budget < fetch && fetch < validated && validated < graph,
    "independently persisted source counts must be verified before deriving any movement");
  assert.doesNotMatch(loader, /serviceRole:\s*true/);
});
