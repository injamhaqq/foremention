import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAgentAutonomy } from "../lib/agent-os/policy.ts";

test("low-risk observation may be recorded without approval", () => {
  assert.deepEqual(evaluateAgentAutonomy({ effectClass: "observe", riskLevel: "low" }), {
    requiresApproval: false,
    autoExecuteAllowed: true,
    reason: "Only low-risk observation and internal control-plane writes may proceed without approval.",
  });
});

test("low-risk internal control-plane write may proceed", () => {
  assert.equal(evaluateAgentAutonomy({ effectClass: "internal_write", riskLevel: "low" }).requiresApproval, false);
});

test("medium internal write fails closed to approval", () => {
  const decision = evaluateAgentAutonomy({ effectClass: "internal_write", riskLevel: "medium" });
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.autoExecuteAllowed, false);
});

for (const effectClass of ["external_communication", "commercial_commitment", "financial", "production_change", "destructive", "legal_compliance"]) {
  test(`${effectClass} always requires approval`, () => {
    const decision = evaluateAgentAutonomy({ effectClass, riskLevel: "low" });
    assert.equal(decision.requiresApproval, true);
    assert.equal(decision.autoExecuteAllowed, false);
  });
}
