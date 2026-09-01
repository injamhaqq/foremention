import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSafeChangeSpecificationDraft,
  validateChangeSpecificationForReview,
  CONTROL_CLASSES,
  DECISION_STATES,
  VERIFICATION_STATES,
} from "../lib/change-specification.ts";

test("canonical Change Specification states remain explicit", () => {
  assert.deepEqual(CONTROL_CLASSES, ["CONTROLLABLE", "INFLUENCEABLE", "UNCONTROLLABLE"]);
  assert.deepEqual(DECISION_STATES, ["DO_NOW", "TEST_FIRST", "DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"]);
  assert.deepEqual(VERIFICATION_STATES, ["IMPROVED", "UNCHANGED", "WORSENED", "INSUFFICIENT_EVIDENCE"]);
});

test("generated drafts default to uncertainty rather than invented confidence", () => {
  const draft = buildSafeChangeSpecificationDraft({
    opportunityId: "11111111-1111-4111-8111-111111111111",
    baselineRunId: "22222222-2222-4222-8222-222222222222",
    title: "Salesforce compatibility gap",
    problemStatement: "Reviewed evidence shows Salesforce compatibility matters in this loss.",
  });
  assert.equal(draft.eligibilityState, "UNKNOWN");
  assert.equal(draft.decisionState, "INSUFFICIENT_EVIDENCE");
  assert.equal(draft.truthState, "HYPOTHESIS");
  assert.equal(draft.confidenceState, "INSUFFICIENT");
  assert.equal(draft.exactChange, null);
  assert.equal(draft.ownerRole, null);
  assert.equal(draft.effort, null);
});

test("review validation refuses incomplete material decisions", () => {
  const result = validateChangeSpecificationForReview({
    ...buildSafeChangeSpecificationDraft({
      opportunityId: "11111111-1111-4111-8111-111111111111",
      baselineRunId: null,
      title: "Pricing gap",
      problemStatement: "Reviewed evidence shows a pricing constraint.",
    }),
    linkedEvidenceCount: 1,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["controlClass", "exactChange", "ownerRole", "effort", "acceptanceCriteria", "verificationPlan"]);
});

test("controllable changes require a surface and uncontrollable factors cannot be DO_NOW", () => {
  const base = {
    ...buildSafeChangeSpecificationDraft({
      opportunityId: "11111111-1111-4111-8111-111111111111",
      baselineRunId: null,
      title: "Capability gap",
      problemStatement: "Reviewed evidence identifies a capability gap.",
    }),
    linkedEvidenceCount: 1,
    exactChange: "Build the verified capability.",
    ownerRole: "Product",
    effort: "MEDIUM",
    acceptanceCriteria: ["Capability is shipped and documented."],
    verificationPlan: { intent: "Repeat the same eligible measurement protocol after execution." },
  };
  const noSurface = validateChangeSpecificationForReview({ ...base, controlClass: "CONTROLLABLE", controlSurface: null });
  assert.equal(noSurface.ok, false);
  assert.deepEqual(noSurface.missing, ["controlSurface"]);

  const impossible = validateChangeSpecificationForReview({ ...base, controlClass: "UNCONTROLLABLE", decisionState: "DO_NOW" });
  assert.equal(impossible.ok, false);
  assert.deepEqual(impossible.invalid, ["uncontrollableDoNow"]);
});
