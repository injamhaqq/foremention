import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readStoredOutcomeComparison } from "../lib/outcome-ledger.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const baselineRunId = "00000000-0000-4000-8000-0000000000d1";
const followUpRunId = "00000000-0000-4000-8000-0000000000d2";
const storedOutcome = {
  baselineRunId,
  followUpRunId,
  baselineCompletedAt: "2026-10-01T00:00:00.000Z",
  followUpCompletedAt: "2026-10-07T00:00:00.000Z",
  brandPresencePct: { before: 20, after: 35, delta: 15 },
  firstMentionPct: { before: 10, after: 12, delta: 2 },
  citationCount: { before: 4, after: 6, delta: 2 },
  newSourceCount: { before: 1, after: 3, delta: 2 },
  interpretation: "This text must never be trusted for causal wording.",
};

test("stored second-cycle metrics are exposed only when the persisted comparison packet is internally valid", () => {
  const comparison = readStoredOutcomeComparison(storedOutcome, baselineRunId, followUpRunId);
  assert.ok(comparison);
  assert.equal(comparison.brandPresencePct.delta, 15);
  assert.equal(comparison.citationCount.delta, 2);
  assert.match(comparison.interpretation, /does not establish.*caused/i);
  assert.doesNotMatch(comparison.interpretation, /must never be trusted/i);

  assert.equal(readStoredOutcomeComparison({ ...storedOutcome, baselineRunId: "00000000-0000-4000-8000-000000000099" }, baselineRunId, followUpRunId), null);
  assert.equal(readStoredOutcomeComparison({ ...storedOutcome, brandPresencePct: { before: 20, after: 35, delta: 99 } }, baselineRunId, followUpRunId), null);
  assert.equal(readStoredOutcomeComparison({ ...storedOutcome, citationCount: { before: 4, after: 6, delta: 1.5 } }, baselineRunId, followUpRunId), null);
});

test("Resolution Center returns and renders the validated exact comparison instead of only a prose summary", async () => {
  const [route, center] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("components/resolution-center.tsx"),
  ]);

  assert.match(route, /readStoredOutcomeComparison/);
  assert.match(route, /comparison:/);
  assert.match(route, /followUp\.status === "complete"/);
  assert.match(center, /comparison\?: FollowUpComparison \| null/);
  assert.match(center, /Exact comparable result/);
  assert.match(center, /Brand presence/);
  assert.match(center, /First mention/);
  assert.match(center, /Citations/);
  assert.match(center, /New sources/);
  assert.match(center, /Comparison withheld/);
  assert.match(center, /Observed association only/i);
  assert.doesNotMatch(center, /caused the improvement|guaranteed improvement/i);
});
