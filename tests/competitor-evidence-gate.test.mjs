import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCompleteCompetitorHistory,
  MAX_COMPETITOR_HISTORY_ANSWERS,
  MAX_COMPETITOR_HISTORY_RUNS,
} from "../lib/competitor-evidence-gate.mjs";

const run = (id, answer_count = 2) => ({ id, status: "complete", answer_count });
const answer = (id, run_id, prompt_key, provider = "cloudflare") => ({
  id, run_id, prompt_key, provider, review_status: "verified",
});

test("complete reviewed competitor history requires every independently recorded answer row", () => {
  const runs = [run("r1"), run("r2")];
  const rows = [
    answer("a1","r1","q1"), answer("a2","r1","q2"),
    answer("a3","r2","q1"), answer("a4","r2","q2"),
  ];
  assert.deepEqual(assessCompleteCompetitorHistory(runs, rows), { ok: true, reason: null });
  assert.equal(assessCompleteCompetitorHistory(runs, rows.slice(0,3)).ok, false);
  assert.equal(assessCompleteCompetitorHistory(runs, [...rows, answer("a5","r2","q3")]).ok, false);
});

test("unreviewed, third-run, duplicate-id and duplicate question/provider evidence fail closed", () => {
  const runs = [run("r1")];
  const good = [answer("a1","r1","q1"), answer("a2","r1","q2")];
  assert.equal(assessCompleteCompetitorHistory(runs, [
    good[0], { ...good[1], review_status: "pending" },
  ]).ok, false);
  assert.equal(assessCompleteCompetitorHistory(runs, [
    good[0], { ...good[1], run_id: "rX" },
  ]).ok, false);
  assert.equal(assessCompleteCompetitorHistory(runs, [
    good[0], { ...good[1], id: "a1" },
  ]).ok, false);
  assert.equal(assessCompleteCompetitorHistory(runs, [
    good[0], { ...good[1], prompt_key: "q1" },
  ]).ok, false);
});

test("history reserves run and answer sentinels instead of trusting a saturated response", () => {
  const tooManyRuns = Array.from({ length: MAX_COMPETITOR_HISTORY_RUNS + 1 }, (_, i) => run(`r${i}`, 1));
  assert.equal(assessCompleteCompetitorHistory(tooManyRuns, []).reason, "RUN_HISTORY_SATURATED");

  const saturated = [run("r1", MAX_COMPETITOR_HISTORY_ANSWERS)];
  assert.equal(assessCompleteCompetitorHistory(saturated, []).reason, "ANSWER_HISTORY_SATURATED");

  assert.equal(assessCompleteCompetitorHistory([run("r1",0)], []).reason, "INVALID_RECORDED_RUN_DENOMINATOR");
});
