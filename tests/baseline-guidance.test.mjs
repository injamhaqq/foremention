import test from "node:test";
import assert from "node:assert/strict";
import { buildBaselineGuidance } from "../lib/baseline-guidance.ts";

const run = { id: "run-a", status: "complete", answers: 1, citations: 0 };
const ready = { website: "https://example.com", approvedQuestions: 5, providerAvailable: true, newestRun: run, observedRun: run, answers: [{ status: "verified" }], sourceCount: 0, reviewedSourceCount: 0 };

test("four approved questions remain incomplete across the shared first-use guide", () => {
  const guide = buildBaselineGuidance({ ...ready, approvedQuestions: 4 });
  assert.equal(guide.complete, false);
  assert.equal(guide.next.href, "/app/prompts");
  assert.equal(guide.steps[1].done, false);
});
test("zero returned citations permit record review without fabricating source review or value", () => {
  const guide = buildBaselineGuidance(ready);
  assert.equal(guide.complete, true);
  assert.equal(guide.recordReviewed, true);
  assert.equal(guide.next.href, "/app/runs/run-a");
  assert.match(guide.next.detail, /No citations were returned/);
  assert.doesNotMatch(guide.next.label, /Create|opportunity/i);
});
test("pending, empty, excluded and incomplete answer sets never count as a reviewed record", () => {
  for (const input of [
    { observedRun: { ...run, status: "review" } },
    { answers: [] },
    { answers: [{ status: "excluded" }] },
    { answers: [{ status: "unreviewed" }] },
    { observedRun: { ...run, answers: 2 } },
  ]) {
    const guide = buildBaselineGuidance({ ...ready, ...input });
    assert.equal(guide.recordReviewed, false);
    assert.equal(guide.complete, false);
    assert.equal(guide.next.href, "/app/runs/run-a");
  }
});
test("failed and active collections take priority without erasing the observed baseline", () => {
  for (const status of ["failed", "queued", "running", "cancelled"]) {
    const guide = buildBaselineGuidance({ ...ready, newestRun: { ...run, id: "new", status } });
    assert.equal(guide.next.href, "/app/runs/new");
    assert.equal(guide.recordReviewed, true);
  }
});
test("source review stays a distinct gate and missing mapped citations fail closed", () => {
  for (const sourceCount of [0, 1]) {
    const guide = buildBaselineGuidance({ ...ready, observedRun: { ...run, citations: 2 }, sourceCount });
    assert.equal(guide.complete, false);
    assert.equal(guide.next.href, "/app/runs/run-a");
    assert.match(guide.next.label, /evidence/i);
  }
});
test("new workspace goes to context then questions then configured collection", () => {
  assert.equal(buildBaselineGuidance({ ...ready, website: null }).next.href, "/app/onboarding");
  const empty = { ...ready, newestRun: null, observedRun: null, answers: [] };
  assert.equal(buildBaselineGuidance(empty).next.href, "/app/prompts");
  assert.equal(buildBaselineGuidance({ ...empty, providerAvailable: false }).next.href, "/app/settings#providers");
});
