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

test("weekly intelligence withholds incomplete bounded answer and Source Map reads", async () => {
  const intelligence = await text("lib/intelligence-loop.ts");

  assert.match(intelligence, /MAX_COMPLETE_RUN_HISTORY_ANSWERS/);
  assert.match(intelligence, /assessCompleteRunHistory\(\[run\], runAnswers\)/);
  assert.match(intelligence, /if \(run\.id === latestRun\?\.id\)/);
  assert.match(intelligence, /source_map_entries\?select=[^\n]+limit=251/);
  assert.match(intelligence, /sourceRows\.length <= 250 \? sourceRows : \[\]/);
  assert.match(intelligence, /costs: \[\]/);
  assert.match(intelligence, /runs\.actual_cost_usd|independently persisted runs\.actual_cost_usd/);
  assert.doesNotMatch(intelligence, /ai_cost_events\?select=/);
  assert.doesNotMatch(intelligence, /run_answers\?select=[^\n]+limit=500/);
});

test("AI Observation Change Graph reuses complete run-pair evidence", async () => {
  const graph = await text("lib/ai-observation-change.ts");

  assert.match(graph, /assessWorkspaceRunPairComparability\(viewer, previous\.id, latestRunId\)/);
  assert.match(graph, /comparison\.answers/);
  assert.doesNotMatch(graph, /run_answers\?select=/);
  assert.doesNotMatch(graph, /limit=500/);
  assert.match(graph, /source_map_entries\?select=source_map_id,competitors_present[^\n]+limit=501/);
  assert.match(graph, /candidateEntries\.length <= 500/);
});

test("Record economics never sums a truncated cost-event ledger as total cost", async () => {
  const [data, page] = await Promise.all([
    text("lib/data.ts"),
    text("app/app/runs/[id]/page.tsx"),
  ]);

  assert.match(data, /MAX_RUN_COST_EVENTS = 500/);
  assert.match(data, /limit=\$\{MAX_RUN_COST_EVENTS \+ 1\}/);
  assert.match(page, /const costEventsComplete = costEvents\.length <= MAX_RUN_COST_EVENTS/);
  assert.match(page, /const totalCost = manifest\?\.actualCostUsd \?\? 0/);
  assert.match(page, /persisted run cost/);
  assert.match(page, /independently persisted run aggregate/);
  assert.doesNotMatch(page, /const totalCost = costEvents\.reduce/);
});
