import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { confirmRunReviewTransition } from "../lib/jobs/run-review-transition.ts";

const expected = {
  runId: "00000000-0000-4000-8000-000000000006",
  answerCount: 2,
  citationCount: 3,
  actualCostUsd: 0.00012,
};

const persisted = (status, overrides = {}) => ({
  id: expected.runId,
  status,
  answer_count: expected.answerCount,
  citation_count: expected.citationCount,
  actual_cost_usd: expected.actualCostUsd,
  ...overrides,
});

test("successful conditional running-to-review transition confirms its row", async () => {
  let reread = false;
  const result = await confirmRunReviewTransition(expected, {
    markReviewIfRunning: async () => [{ id: expected.runId }],
    reload: async () => { reread = true; return []; },
  });
  assert.equal(result, "committed");
  assert.equal(reread, false);
});

test("cancellation racing with completion cannot resurrect a cancelled run", async () => {
  const result = await confirmRunReviewTransition(expected, {
    markReviewIfRunning: async () => [],
    reload: async () => [persisted("cancelled")],
  });
  assert.equal(result, "terminal");
});

test("lost review acknowledgement reconciles an already-persisted matching review", async () => {
  const result = await confirmRunReviewTransition(expected, {
    markReviewIfRunning: async () => { throw new Error("acknowledgement lost"); },
    reload: async () => [persisted("review", { actual_cost_usd: "0.000120" })],
  });
  assert.equal(result, "reconciled");
});

test("lost acknowledgement with different persisted evidence does not claim success", async () => {
  await assert.rejects(
    confirmRunReviewTransition(expected, {
      markReviewIfRunning: async () => { throw new Error("acknowledgement lost"); },
      reload: async () => [persisted("review", { citation_count: 4 })],
    }),
    /acknowledgement lost/,
  );
});

test("failed, complete, and partial rows cannot be overwritten by delayed background completion", async () => {
  for (const status of ["failed", "complete", "partial"]) {
    assert.equal(await confirmRunReviewTransition(expected, {
      markReviewIfRunning: async () => [],
      reload: async () => [persisted(status)],
    }), "terminal");
  }
});

test("queued, missing, or inconsistent review state fails closed for retry/reconciliation", async () => {
  for (const rows of [[persisted("queued")], [], [persisted("review", { answer_count: 1 })]]) {
    await assert.rejects(
      confirmRunReviewTransition(expected, {
        markReviewIfRunning: async () => [],
        reload: async () => rows,
      }),
      /could not be confirmed/,
    );
  }
});

test("collector uses status-conditional compare-and-set and suppresses post-cancel review side effects", async () => {
  const code = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
  assert.match(code, /confirmRunReviewTransition\(/);
  assert.match(code, /&status=eq\.running/);
  assert.match(code, /markReviewIfRunning:/);
  assert.match(code, /prefer: "return=representation"/);
  assert.match(code, /if \(reviewTransition === "terminal"\) \{/);
  assert.ok(code.indexOf('if (reviewTransition === "terminal")') < code.indexOf('step.sendEvent("deliver-collection-webhooks"'));
});
