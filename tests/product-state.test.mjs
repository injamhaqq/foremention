import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_STATES,
  productStateLabel,
  stateForAlerts,
  stateForCompetitors,
  stateForRun,
  stateForSources,
} from "../lib/product-state.ts";

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

test("competitor state distinguishes setup, pause, ready-to-collect, and observed evidence", () => {
  assert.equal(stateForCompetitors([]), "NOT_CONFIGURED");
  assert.equal(stateForCompetitors([{ active: false, totalAnswers: 4 }]), "PAUSED");
  assert.equal(stateForCompetitors([{ active: true, totalAnswers: 0 }]), "READY_TO_COLLECT");
  assert.equal(stateForCompetitors([{ active: true, totalAnswers: 4 }]), "COMPLETE");
  assert.equal(stateForCompetitors([{ active: false, totalAnswers: 4 }, { active: true, totalAnswers: 0 }]), "READY_TO_COLLECT");
});

test("alert state distinguishes caught-up, unread, and recoverable failure events", () => {
  assert.equal(stateForAlerts([]), "COMPLETE");
  assert.equal(stateForAlerts([{ kind: "collection_complete", read: true }]), "COMPLETE");
  assert.equal(stateForAlerts([{ kind: "collection_complete", read: false }]), "NEEDS_REVIEW");
  assert.equal(stateForAlerts([{ kind: "provider_failed", read: false }]), "FAILED_RECOVERABLE");
  assert.equal(stateForAlerts([{ kind: "source_error", read: false }]), "FAILED_RECOVERABLE");
});
