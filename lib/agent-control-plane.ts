import { safeOperationalError } from "@/lib/collection-policy";
import { supabaseRest } from "@/lib/supabase-rest";

export type ForementionAgentId =
  | "run-supervisor"
  | "question-scout"
  | "answer-collector"
  | "evidence-mapper"
  | "brand-observer"
  | "human-review-gate";

export type ForementionAgentStatus = "waiting" | "running" | "review" | "complete" | "failed" | "cancelled";
export type AgentTelemetrySource = "recorded" | "derived" | "fictional";

export type ForementionAgentDefinition = {
  id: ForementionAgentId;
  name: string;
  mode: "control" | "deterministic" | "provider" | "human";
  purpose: string;
  evidenceBoundary: string;
};

export type AgentMetric = { label: string; value: string };

export type AgentExecutionView = ForementionAgentDefinition & {
  status: ForementionAgentStatus;
  summary: string;
  metrics: AgentMetric[];
  runId: string | null;
  observedAt: string | null;
  telemetry: AgentTelemetrySource;
};

export type AgentControlPlaneView = {
  agents: AgentExecutionView[];
  latestRunId: string | null;
  recordedExecutions: number;
  activeAgents: number;
  failedAgents: number;
  waitingAgents: number;
  telemetry: AgentTelemetrySource;
};

export const FOREMENTION_AGENTS: readonly ForementionAgentDefinition[] = [
  {
    id: "run-supervisor",
    name: "Run Supervisor",
    mode: "control",
    purpose: "Controls idempotency, cost ceilings, cancellation, retries, and the final run state.",
    evidenceBoundary: "It coordinates work. It never creates an answer or citation.",
  },
  {
    id: "question-scout",
    name: "Question Scout",
    mode: "deterministic",
    purpose: "Revalidates the frozen buyer-question set, project, category, brand, and competitors.",
    evidenceBoundary: "It validates customer records. It does not invent new buyer questions.",
  },
  {
    id: "answer-collector",
    name: "Answer Collector",
    mode: "provider",
    purpose: "Calls exactly one approved provider and persists its answer, model, timing, usage, cost, and failures.",
    evidenceBoundary: "A provider failure remains a failure. No fallback text is fabricated.",
  },
  {
    id: "evidence-mapper",
    name: "Evidence Mapper",
    mode: "deterministic",
    purpose: "Canonicalizes returned citation URLs and connects answers to sources and dated observations.",
    evidenceBoundary: "Only provider-returned URLs become citation evidence.",
  },
  {
    id: "brand-observer",
    name: "Brand Observer",
    mode: "deterministic",
    purpose: "Measures brand and competitor mentions in persisted answers from the same controlled run.",
    evidenceBoundary: "It records observed text positions, not buyer intent or causal influence.",
  },
  {
    id: "human-review-gate",
    name: "Human Review Gate",
    mode: "human",
    purpose: "Keeps collected answers and citations out of approved metrics until a person reviews the run.",
    evidenceBoundary: "Foremention never auto-publishes an unreviewed conclusion.",
  },
] as const;

export function getForementionAgent(id: string) {
  return FOREMENTION_AGENTS.find((agent) => agent.id === id) || null;
}

async function deterministicJobId(runId: string, agentId: ForementionAgentId) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`foremention:${runId}:${agentId}:v1`)),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type AgentResult = Record<string, string | number | boolean | null>;

export async function recordAgentExecution(input: {
  runId: string;
  organizationId: string;
  projectId: string;
  agentId: ForementionAgentId;
  status: Exclude<ForementionAgentStatus, "waiting" | "review">;
  attemptCount?: number;
  result?: AgentResult;
  error?: unknown;
}) {
  const now = new Date().toISOString();
  const id = await deterministicJobId(input.runId, input.agentId);
  const terminal = ["complete", "failed", "cancelled"].includes(input.status);
  await supabaseRest("jobs?on_conflict=id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id,
      organization_id: input.organizationId,
      project_id: input.projectId,
      job_type: `foremention.agent.${input.agentId}`,
      status: input.status,
      payload: { runId: input.runId, agentId: input.agentId, version: "1.0" },
      result: input.result || null,
      error_detail: input.error ? safeOperationalError(input.error) : null,
      attempt_count: Math.max(0, Math.round(input.attemptCount || 0)),
      ...(input.status === "running" ? { scheduled_at: now, started_at: now } : {}),
      ...(terminal ? { completed_at: now } : {}),
    },
  });
}
