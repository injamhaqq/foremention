import assert from "node:assert/strict";
import test from "node:test";
import { deriveActivationStage } from "../lib/retention-loop.ts";

const base = {
  workspaceConfigured: false,
  approvedQuestions: 0,
  firstCollectionCompleted: false,
  firstRecordReviewed: false,
  firstActionCreated: false,
  firstActionAssigned: false,
  comparableReviewedCycles: 0,
};

test("activation guidance advances one evidence-backed step at a time", () => {
  assert.equal(deriveActivationStage(base).key, "workspace_configured");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 4 }).key, "five_questions");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5 }).key, "first_record");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true }).key, "first_review");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstRecordReviewed: true }).key, "first_action");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstRecordReviewed: true, firstActionCreated: true }).key, "action_assigned");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstRecordReviewed: true, firstActionCreated: true, firstActionAssigned: true, comparableReviewedCycles: 1 }).key, "second_comparable_cycle");
  assert.equal(deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstRecordReviewed: true, firstActionCreated: true, firstActionAssigned: true, comparableReviewedCycles: 2 }).key, "retained_loop");
});

test("a run or action cannot skip the required human-review boundary", () => {
  const stage = deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstActionCreated: true, firstActionAssigned: true, comparableReviewedCycles: 2 });
  assert.equal(stage.key, "first_review");
  assert.match(stage.detail, /review/i);
});

test("a created but unassigned action cannot skip the ownership boundary", () => {
  const stage = deriveActivationStage({ ...base, workspaceConfigured: true, approvedQuestions: 5, firstCollectionCompleted: true, firstRecordReviewed: true, firstActionCreated: true, comparableReviewedCycles: 2 });
  assert.equal(stage.key, "action_assigned");
  assert.match(stage.detail, /owner/i);
});
