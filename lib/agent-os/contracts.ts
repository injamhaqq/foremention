export const OPERATING_AGENT_IDS = [
  "research-insight",
  "customer-success",
  "onboarding",
  "sales",
  "marketing",
  "support",
  "product",
  "qa",
  "engineering",
  "finance-ops",
  "ceo",
] as const;

export const AGENT_EFFECT_CLASSES = [
  "observe",
  "internal_write",
  "external_communication",
  "commercial_commitment",
  "financial",
  "production_change",
  "destructive",
  "legal_compliance",
] as const;

export const AGENT_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export const AGENT_ACTION_STATUSES = [
  "proposed",
  "pending_approval",
  "approved",
  "rejected",
  "executing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type OperatingAgentId = typeof OPERATING_AGENT_IDS[number];
export type AgentEffectClass = typeof AGENT_EFFECT_CLASSES[number];
export type AgentRiskLevel = typeof AGENT_RISK_LEVELS[number];
export type AgentActionStatus = typeof AGENT_ACTION_STATUSES[number];

export type AgentEvidenceRef = {
  type: "run" | "source_map" | "scorecard" | "placement" | "commercial_account" | "other";
  id?: string;
  href?: string;
  note?: string;
};

export type AgentActionProposal = {
  organizationId?: string | null;
  projectId?: string | null;
  runId?: string | null;
  agentId: OperatingAgentId;
  actionType: string;
  effectClass: AgentEffectClass;
  riskLevel: AgentRiskLevel;
  title: string;
  rationale: string;
  evidence: AgentEvidenceRef[];
  payload?: Record<string, unknown>;
  confidence?: number | null;
  estimatedCostUsd?: number | null;
  idempotencyKey: string;
};

export type AgentActionRecord = AgentActionProposal & {
  id: string;
  status: AgentActionStatus;
  requiresApproval: boolean;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
