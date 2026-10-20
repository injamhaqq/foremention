/**
 * Chat04 CV-05 / A14 / A15: map persisted rows (runs, run_answers,
 * record_decisions, active prompts, project question-set epoch) into the pure
 * `LoopProjectSnapshot` consumed by `computeCustomerValueLoop`.
 *
 * Columns come from the Chat04 proposal migration
 * (04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql):
 * runs.question_set_version, runs.cycle_origin, run_answers.observation_method,
 * run_answers.sampling_json; the persisted measurement context and adapter
 * metadata in raw_json. Absent values stay null/unknown so
 * the loop reports "not comparable" rather than guessing.
 */
import { coerceComparableMeasurementContext, coerceStoredComparableMeasurementContext, type ComparableMeasurementContext } from "./intelligence-comparability.ts";
import type { LoopAnswerSlot, LoopDecision, LoopProjectSnapshot, LoopRun, LoopRunStatus } from "./customer-value-loop.ts";

export const LOOP_RUN_COLUMNS = "id,organization_id,project_id,status,created_at,methodology_version,question_set_version,cycle_origin";
export const LOOP_ANSWER_COLUMNS = "run_id,organization_id,prompt_key,prompt_text,provider,model,review_status,observation_method,sampling_json,measurement_context_json,protocol_observation_method:raw_json->observationMethod,protocol_retrieval_provider:raw_json->retrievalProvider";
export const LOOP_RUN_LIMIT = 20;
export const LOOP_ANSWER_LIMIT = 1000;

export type LoopRunRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  status: string;
  created_at: string;
  methodology_version: string | null;
  question_set_version: number | null;
  cycle_origin: string | null;
};

export type LoopAnswerRow = {
  run_id: string;
  organization_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  review_status: string;
  observation_method: string | null;
  sampling_json: Record<string, unknown> | null;
  measurement_context_json: Record<string, unknown> | null;
  raw_json?: unknown;
  protocol_observation_method?: unknown;
  protocol_retrieval_provider?: unknown;
};

const runStatuses: LoopRunStatus[] = ["queued", "running", "review", "partial", "complete", "failed", "cancelled", "interrupted"];
/** Stable, key-sorted identity for a sampling object; null when unavailable. */
export function samplingIdentity(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;
  return JSON.stringify(Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))));
}

export function measurementContextFrom(value: unknown, raw?: unknown): ComparableMeasurementContext | null {
  return coerceComparableMeasurementContext(value, raw);
}

export function answerRowToSlot(row: LoopAnswerRow): LoopAnswerSlot {
  const method = typeof row.observation_method === "string" && row.observation_method.trim() ? row.observation_method.trim() : null;
  const measurementContext = coerceStoredComparableMeasurementContext(row);
  if (measurementContext?.observationMethod && method && measurementContext.observationMethod !== method) {
    measurementContext.observationMethod = null;
  }
  return {
    promptKey: row.prompt_key,
    promptText: row.prompt_text,
    provider: row.provider,
    model: row.model,
    sampling: samplingIdentity(row.sampling_json),
    method,
    measurementContext,
    // The database enum calls a rejected answer "excluded".
    reviewStatus: row.review_status === "verified" ? "verified" : row.review_status === "excluded" ? "rejected" : "unreviewed",
  };
}

export function runRowToLoop(row: LoopRunRow, answers: LoopAnswerRow[]): LoopRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id || "",
    status: (runStatuses as string[]).includes(row.status) ? row.status as LoopRunStatus : "interrupted",
    createdAt: row.created_at,
    methodologyVersion: row.methodology_version,
    questionSetVersion: typeof row.question_set_version === "number" ? row.question_set_version : null,
    origin: row.cycle_origin === "customer_cycle" ? "customer_cycle" : row.cycle_origin === "fixture" ? "fixture" : "unknown",
    answers: answers
      .filter((answer) => answer.run_id === row.id && answer.organization_id === row.organization_id)
      .map(answerRowToSlot),
  };
}

export function buildLoopSnapshot(input: {
  organizationId: string;
  projectId: string;
  brand: string | null;
  activePrompts: Array<{ prompt_text: string; updated_at: string }>;
  questionSetVersion: number | null;
  runs: LoopRunRow[];
  answers: LoopAnswerRow[];
  decisions: LoopDecision[];
}): LoopProjectSnapshot {
  const runs = input.runs
    .filter((run) => run.organization_id === input.organizationId && run.project_id === input.projectId)
    .map((run) => runRowToLoop(run, input.answers));
  const approvedAt = input.activePrompts.map((prompt) => prompt.updated_at).sort().pop() || "";
  return {
    organizationId: input.organizationId,
    projectId: input.projectId,
    brand: input.brand,
    competitors: [],
    approvedQuestions: input.activePrompts.length
      ? { version: input.questionSetVersion ?? 0, questions: input.activePrompts.map((prompt) => prompt.prompt_text), approvedAt }
      : null,
    // Persisted runs are the only collection evidence; with none, setup stays setup-only.
    collectionRequested: runs.length > 0,
    runs,
    decisions: input.decisions.filter((decision) => decision.organizationId === input.organizationId && decision.projectId === input.projectId),
  };
}
