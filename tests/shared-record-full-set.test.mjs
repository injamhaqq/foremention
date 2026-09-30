import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  MAX_SHARED_RECORD_ANSWERS,
  assessSharedRecordEvidenceSet,
} from "../lib/shared-record-evidence-gate.ts";

const original = { id: "owned-run", status: "complete", answer_count: 2 };
const answer = (suffix, extra = {}) => ({
  id: "answer-" + suffix,
  run_id: original.id,
  prompt_key: "question-" + suffix,
  provider: "cloudflare",
  review_status: "verified",
  ...extra,
});
const pair = () => [answer("one"), answer("two")];

test("only a fully returned unique finalized reviewed set qualifies for executive review-complete status", () => {
  assert.deepEqual(assessSharedRecordEvidenceSet(original, pair()), {
    fullyLoaded: true, reviewComplete: true, reviewedCount: 2, reason: null,
  });
  const partial = assessSharedRecordEvidenceSet({ ...original, status: "partial" }, pair());
  assert.equal(partial.reviewComplete, true, "a legitimate terminal partial run can review every answer");
  assert.equal(partial.fullyLoaded, true);
});

test("a subset that happens to be entirely verified must never qualify as the complete shared Record", () => {
  const report = assessSharedRecordEvidenceSet(original, [answer("one")]);
  assert.equal(report.fullyLoaded, false);
  assert.equal(report.reviewComplete, false);
  assert.equal(report.reviewedCount, 0, "do not advertise partial returned data as the true full reviewed count");
});

test("an oversized run and a 201-row PostgREST sentinel never produce a partial executive summary", () => {
  const many = Array.from({ length: MAX_SHARED_RECORD_ANSWERS + 1 }, (_, i) => answer(String(i)));
  for (const [run, rows] of [
    [{ ...original, answer_count: 201 }, many.slice(0, 200)],
    [{ ...original, answer_count: 200 }, many],
    [{ ...original, answer_count: 2 }, many],
  ]) {
    const result = assessSharedRecordEvidenceSet(run, rows);
    assert.equal(result.fullyLoaded, false);
    assert.equal(result.reviewComplete, false);
  }
});

test("wrong-run observations, repeated answer IDs and duplicate question/provider slots fail closed", () => {
  for (const rows of [
    [answer("one"), answer("two", { run_id: "different-run" })],
    [answer("one"), answer("two", { id: "answer-one" })],
    [answer("one"), answer("two", { prompt_key: "question-one" })],
    [answer("one"), answer("two", { provider: "" })],
    [answer("one"), answer("two", { prompt_key: "" })],
  ]) {
    const result = assessSharedRecordEvidenceSet(original, rows);
    assert.equal(result.fullyLoaded, false);
    assert.equal(result.reviewComplete, false);
  }
});

test("valid but unreviewed shares remain observed evidence and never become reviewed conclusions", () => {
  const cases = [
    { run: original, rows: [answer("one"), answer("two", { review_status: "pending" })] },
    { run: { ...original, status: "review" }, rows: pair() },
    { run: { ...original, status: "running" }, rows: pair() },
  ];
  for (const { run, rows } of cases) {
    const result = assessSharedRecordEvidenceSet(run, rows);
    assert.equal(result.fullyLoaded, true);
    assert.equal(result.reviewComplete, false);
  }
});

test("missing, zero, fractional or impossible answer counts cannot qualify", () => {
  for (const count of [null, 0, -2, 0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = assessSharedRecordEvidenceSet({ ...original, answer_count: count }, pair());
    assert.equal(result.fullyLoaded, false);
  }
});

test("the actual private share page checks the exact scoped full set and hides incomplete answer data", async () => {
  const page = await readFile(new URL("../app/share/record/[token]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /assessSharedRecordEvidenceSet\(run, answers\)/);
  assert.match(page, /run_answers\?select=id,run_id,/);
  assert.match(page, /run_id=eq\.\$\{share\.run_id\}/);
  assert.match(page, /organization_id=eq\.\$\{share\.organization_id\}/);
  assert.match(page, /limit=201/);
  assert.match(page, /visibleAnswers = evidenceState\.fullyLoaded \? answers : \[\]/);
  assert.match(page, /viewMode === "executive" && evidenceState\.fullyLoaded/);
  assert.match(page, /viewMode === "stakeholder" && evidenceState\.fullyLoaded/);
  assert.match(page, /All .* persisted answers in this collection are recorded as reviewed/);
  assert.match(page, /does not independently prove citation relevance/);
  assert.doesNotMatch(page, /safeConclusion \? "Available"/);
});
