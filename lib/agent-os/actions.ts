import type { AgentActionProposal, AgentActionRecord, AgentActionStatus } from "@/lib/agent-os/contracts";
import { evaluateAgentAutonomy } from "@/lib/agent-os/policy";
import { supabaseRest } from "@/lib/supabase-rest";

type AgentExecutionRow = {
  action_id: string;
  status: NonNullable<AgentActionRecord["execution"]>["status"];
  provider: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  completed_at: string | null;
};

type AgentActionRow = {
  id: string;
  organization_id: string | null;
  project_id: string | null;
  run_id: string | null;
  agent_id: AgentActionRecord["agentId"];
  action_type: string;
  effect_class: AgentActionRecord["effectClass"];
  risk_level: AgentActionRecord["riskLevel"];
  status: AgentActionStatus;
  title: string;
  rationale: string;
  confidence: number | string | null;
  evidence_json: AgentActionRecord["evidence"];
  payload_json: Record<string, unknown>;
  requires_approval: boolean;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  estimated_cost_usd: number | string | null;
  idempotency_key: string;
  executed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function numberOrNull(value: number | string | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function actionView(row: AgentActionRow, execution: AgentExecutionRow | null = null): AgentActionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    runId: row.run_id,
    agentId: row.agent_id,
    actionType: row.action_type,
    effectClass: row.effect_class,
    riskLevel: row.risk_level,
    status: row.status,
    title: row.title,
    rationale: row.rationale,
    evidence: Array.isArray(row.evidence_json) ? row.evidence_json : [],
    payload: row.payload_json || {},
    confidence: numberOrNull(row.confidence),
    estimatedCostUsd: numberOrNull(row.estimated_cost_usd),
    idempotencyKey: row.idempotency_key,
    requiresApproval: row.requires_approval,
    decisionNote: row.decision_note,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    executedAt: row.executed_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    execution: execution ? {
      status: execution.status,
      provider: execution.provider,
      providerMessageId: execution.provider_message_id,
      errorCode: execution.error_code,
      completedAt: execution.completed_at,
    } : null,
  };
}

export async function proposeAgentAction(input: AgentActionProposal) {
  const policy = evaluateAgentAutonomy(input);
  const now = new Date().toISOString();
  const initialStatus: AgentActionStatus = policy.requiresApproval ? "pending_approval" : "completed";
  const rows = await supabaseRest<AgentActionRow[]>("agent_actions?on_conflict=idempotency_key", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      organization_id: input.organizationId || null,
      project_id: input.projectId || null,
      run_id: input.runId || null,
      agent_id: input.agentId,
      action_type: input.actionType.trim().slice(0, 120),
      effect_class: input.effectClass,
      risk_level: input.riskLevel,
      status: initialStatus,
      title: input.title.trim().slice(0, 240),
      rationale: input.rationale.trim().slice(0, 4000),
      confidence: input.confidence ?? null,
      evidence_json: input.evidence,
      payload_json: input.payload || {},
      requires_approval: policy.requiresApproval,
      estimated_cost_usd: input.estimatedCostUsd ?? null,
      idempotency_key: input.idempotencyKey.trim().slice(0, 240),
      completed_at: policy.requiresApproval ? null : now,
    },
  });
  const created = rows[0];
  if (created) return actionView(created);

  const existing = await supabaseRest<AgentActionRow[]>(
    `agent_actions?select=*&idempotency_key=eq.${encodeURIComponent(input.idempotencyKey)}&limit=1`,
    { serviceRole: true },
  );
  if (!existing[0]) throw new Error("Agent action could not be recorded.");
  return actionView(existing[0]);
}

export async function loadOperatingAgentActions(limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Math.round(limit)));
  const rows = await supabaseRest<AgentActionRow[]>(
    `agent_actions?select=*&order=created_at.desc&limit=${safeLimit}`,
    { serviceRole: true },
  );
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id).join(",");
  const executions = await supabaseRest<AgentExecutionRow[]>(
    `agent_action_executions?select=action_id,status,provider,provider_message_id,error_code,completed_at&action_id=in.(${ids})`,
    { serviceRole: true },
  ).catch(() => []);
  const executionByAction = new Map(executions.map((execution) => [execution.action_id, execution]));
  return rows.map((row) => actionView(row, executionByAction.get(row.id) || null));
}

export async function loadAgentAction(actionId: string) {
  const rows = await supabaseRest<AgentActionRow[]>(
    `agent_actions?select=*&id=eq.${encodeURIComponent(actionId)}&limit=1`,
    { serviceRole: true },
  );
  const row = rows[0];
  if (!row) return null;
  const executions = await supabaseRest<AgentExecutionRow[]>(
    `agent_action_executions?select=action_id,status,provider,provider_message_id,error_code,completed_at&action_id=eq.${encodeURIComponent(actionId)}&limit=1`,
    { serviceRole: true },
  ).catch(() => []);
  return actionView(row, executions[0] || null);
}

export async function decideAgentAction(input: {
  actionId: string;
  decision: "approve" | "reject";
  actorId: string;
  note?: string | null;
}) {
  const existing = await supabaseRest<AgentActionRow[]>(
    `agent_actions?select=*&id=eq.${encodeURIComponent(input.actionId)}&limit=1`,
    { serviceRole: true },
  );
  const action = existing[0];
  if (!action) throw new Error("Agent action not found.");
  if (!action.requires_approval || action.status !== "pending_approval") {
    throw new Error("This agent action is not waiting for approval.");
  }

  const decidedAt = new Date().toISOString();
  const nextStatus: AgentActionStatus = input.decision === "approve" ? "approved" : "rejected";
  const rows = await supabaseRest<AgentActionRow[]>(
    `agent_actions?id=eq.${encodeURIComponent(action.id)}&status=eq.pending_approval`,
    {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=representation",
      body: {
        status: nextStatus,
        decision_note: input.note?.trim().slice(0, 2000) || null,
        decided_by: input.actorId,
        decided_at: decidedAt,
      },
    },
  );
  if (!rows[0]) throw new Error("The agent action changed before this decision was recorded.");

  if (action.organization_id) {
    await supabaseRest("audit_logs", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        organization_id: action.organization_id,
        actor_id: input.actorId,
        action: input.decision === "approve" ? "agent_action.approved" : "agent_action.rejected",
        entity_type: "agent_action",
        entity_id: action.id,
        before_state: { status: action.status, requires_approval: action.requires_approval },
        after_state: { status: nextStatus, agent_id: action.agent_id, action_type: action.action_type },
      },
    }).catch(() => undefined);
  }
  return actionView(rows[0]);
}
