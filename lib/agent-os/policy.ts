import type { AgentEffectClass, AgentRiskLevel } from "@/lib/agent-os/contracts";

export type AgentAutonomyDecision = {
  requiresApproval: boolean;
  autoExecuteAllowed: boolean;
  reason: string;
};

const consequentialEffects = new Set<AgentEffectClass>([
  "external_communication",
  "commercial_commitment",
  "financial",
  "production_change",
  "destructive",
  "legal_compliance",
]);

/**
 * Fail-closed autonomy policy.
 *
 * V1 allows agents to observe and write low-risk internal control-plane records.
 * Any external/consequential effect, or any medium+ risk action, requires a
 * human decision before a future executor may act on it.
 */
export function evaluateAgentAutonomy(input: {
  effectClass: AgentEffectClass;
  riskLevel: AgentRiskLevel;
}): AgentAutonomyDecision {
  if (consequentialEffects.has(input.effectClass)) {
    return {
      requiresApproval: true,
      autoExecuteAllowed: false,
      reason: "External or consequential effects always require human approval.",
    };
  }
  if (input.riskLevel !== "low") {
    return {
      requiresApproval: true,
      autoExecuteAllowed: false,
      reason: "Medium, high, and critical risk actions require human approval.",
    };
  }
  return {
    requiresApproval: false,
    autoExecuteAllowed: input.effectClass === "observe" || input.effectClass === "internal_write",
    reason: "Only low-risk observation and internal control-plane writes may proceed without approval.",
  };
}
