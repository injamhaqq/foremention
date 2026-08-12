import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCT_STATES, productStateLabel, stateForRun, stateForSources } from "../lib/product-state.ts";

test("Foremention exposes the canonical customer product states", () => {
  assert.deepEqual(PRODUCT_STATES, [
    "NOT_CONFIGURED", "READY_TO_COLLECT", "COLLECTING", "PARTIALLY_COMPLETE", "COMPLETE", "NEEDS_REVIEW",
    "FILTERED_EMPTY", "PAUSED", "FAILED_RECOVERABLE", "FAILED_BLOCKING", "PERMISSION_DENIED", "NOT_FOUND",
  ]);
});

test("run states never collapse collecting, review, partial, failure, and empty into one no-data state", () => {
  assert.equal(stateForRun(null), "READY_TO_COLLECT");
  assert.equal(stateForRun({ status: "queued" }), "COLLECTING");
  assert.equal(stateForRun({ status: "running" }), "COLLECTING");
  assert.equal(stateForRun({ status: "review" }), "NEEDS_REVIEW");
  assert.equal(stateForRun({ status: "partial" }), "PARTIALLY_COMPLETE");
  assert.equal(stateForRun({ status: "complete" }), "COMPLETE");
  assert.equal(stateForRun({ status: "failed" }), "FAILED_RECOVERABLE");
  assert.equal(stateForRun({ status: "cancelled" }), "READY_TO_COLLECT");
});

test("source state prefers real mapped evidence and review state over an empty-looking latest run", () => {
  assert.equal(stateForSources({ status: "complete", citationCount: 0 }, 0, 0), "COMPLETE");
  assert.equal(stateForSources({ status: "running" }, 0, 0), "COLLECTING");
  assert.equal(stateForSources({ status: "failed" }, 0, 0), "FAILED_RECOVERABLE");
  assert.equal(stateForSources({ status: "complete" }, 3, 2), "NEEDS_REVIEW");
  assert.equal(stateForSources({ status: "complete" }, 3, 0), "COMPLETE");
  assert.equal(productStateLabel("FAILED_RECOVERABLE"), "Needs another try");
});
