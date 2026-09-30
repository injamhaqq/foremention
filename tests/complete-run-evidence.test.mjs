import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCompleteRunHistory,
  MAX_COMPLETE_RUN_HISTORY_ANSWERS,
  MAX_COMPLETE_RUN_HISTORY_RUNS,
} from "../lib/complete-run-evidence.mjs";

const run = (id, answer_count = 2, provider_ids = ["cloudflare"]) => ({
  id, status: "complete", answer_count, provider_ids,
});
const answer = (id, run_id, prompt_key, provider = "cloudflare") => ({
  id, run_id, prompt_key, provider, review_status: "verified",
});

test("complete run evidence requires the exact independently recorded verified set", () => {
  const runs = [run("r1"), run("r2")];
  const rows = [
    answer("a1", "r1", "q1"),
    answer("a2", "r1", "q2"),
    answer("a3", "r2", "q1"),
    answer("a4", "r2", "q2"),
  ];
  assert.deepEqual(assessCompleteRunHistory(runs, rows), { ok: true, reason: null });
  assert.equal(assessCompleteRunHistory(runs, rows.slice(0, 3)).reason, "VERIFIED_ANSWER_COUNT_MISMATCH");
  assert.equal(assessCompleteRunHistory(runs, [...rows, answer("a5", "r2", "q3")]).reason, "VERIFIED_ANSWER_COUNT_MISMATCH");
});

test("ambiguous provenance, duplicates, and unrecorded providers fail closed", () => {
  const runs = [run("r1", 2, ["cloudflare", "groq"])];
  const rows = [answer("a1", "r1", "q1"), answer("a2", "r1", "q2", "groq")];
  assert.equal(assessCompleteRunHistory(runs, [
    rows[0], { ...rows[1], review_status: "pending" },
  ]).reason, "INVALID_VERIFIED_ANSWER_PROVENANCE");
  assert.equal(assessCompleteRunHistory(runs, [
    rows[0], { ...rows[1], id: "a1" },
  ]).reason, "DUPLICATE_ANSWER_ID");
  assert.equal(assessCompleteRunHistory(runs, [
    rows[0], { ...rows[1], prompt_key: "q1", provider: "cloudflare" },
  ]).reason, "DUPLICATE_QUESTION_PROVIDER_SLOT");
  assert.equal(assessCompleteRunHistory([run("r1", 1)], [
    answer("a1", "r1", "q1", "unexpected"),
  ]).reason, "UNRECORDED_PROVIDER");
});

test("bounded run and answer reads reserve a sentinel instead of accepting saturation", () => {
  const tooManyRuns = Array.from({ length: MAX_COMPLETE_RUN_HISTORY_RUNS + 1 }, (_, i) => run(`r${i}`, 1));
  assert.equal(assessCompleteRunHistory(tooManyRuns, []).reason, "RUN_HISTORY_SATURATED");
  assert.equal(
    assessCompleteRunHistory([run("r1", MAX_COMPLETE_RUN_HISTORY_ANSWERS)], []).reason,
    "ANSWER_HISTORY_SATURATED",
  );
  assert.equal(assessCompleteRunHistory([run("r1", 0)], []).reason, "INVALID_RECORDED_RUN_DENOMINATOR");
});
