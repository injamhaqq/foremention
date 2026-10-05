import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Decision Lab and question performance fail closed on incomplete bounded answer sets", async () => {
  const integrity = await text("lib/evidence-integrity-data.ts");
  assert.match(integrity, /assessCompleteRunHistory\(\[latest\], candidateAnswers\)/);
  assert.match(integrity, /answerCompletionPct: answerGate\.ok \?/);
  assert.match(integrity, /decisionReadiness: answerGate\.ok && answers\.length/);
  assert.match(integrity, /MAX_COMPLETE_RUN_HISTORY_RUNS \+ 1/);
  assert.match(integrity, /assessCompleteRunHistory\(historyRunRows, rows\)/);
  assert.match(integrity, /project_id=eq\.\$\{context\.projectId\}/);
});

test("competitor history is withheld instead of treating a capped subset as complete", async () => {
  const [integrity, component] = await Promise.all([
    text("lib/evidence-integrity-data.ts"),
    text("components/competitor-tracker.tsx"),
  ]);
  assert.match(integrity, /MAX_COMPETITOR_HISTORY_RUNS \+ 1/);
  assert.match(integrity, /assessCompleteCompetitorHistory\(historyRuns, candidateAnswers\)/);
  assert.match(integrity, /answerHistoryComplete/);
  assert.match(component, /Withheld · incomplete history/);
});

test("all exact movement surfaces share the complete run-pair comparator", async () => {
  const [pair, safe, reviewed] = await Promise.all([
    text("lib/run-pair-comparability.ts"),
    text("lib/safe-intelligence.ts"),
    text("lib/reviewed-change-notifications.ts"),
  ]);
  assert.match(pair, /answer_count/);
  assert.match(pair, /validPairedRunAnswerBudget\(earlier, later\)/);
  assert.match(pair, /assessCompleteVerifiedRunPair\(earlier, later, rows\)/);
  assert.match(pair, /MAX_VERIFIED_RUN_PAIR_ANSWERS/);
  assert.match(safe, /assessWorkspaceRunPairComparability/);
  assert.doesNotMatch(safe, /run_answers\?select=/);
  assert.doesNotMatch(safe, /limit=500/);
  assert.match(reviewed, /assessWorkspaceRunPairComparability/);
});
