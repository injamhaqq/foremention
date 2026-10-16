/**
 * Chat04 CV-05 / A15: persisted human decisions on a reviewed Recommendation
 * Record (proposal migration
 * docs/execution/attach-v1/04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql).
 *
 * Pure and dependency-injected so it is testable without Supabase:
 * - validates the decision body before any database call (no fabricated owner
 *   for explicit no-action / reviewer disagreement);
 * - builds the `save_record_decision` RPC body with the server-resolved
 *   organization/project scope (never client-supplied scope);
 * - recovers a lost acknowledgement by re-reading the save key and running
 *   `reconcileDecisionSave` instead of re-posting blindly;
 * - maps database refusals (PT4xx) and "migration not applied yet" to
 *   explicit responses, never to a fake success.
 */
import { type LoopDecision, type LoopDecisionKind } from "./customer-value-loop.ts";
import { reconcilePersistedDecisionReplay } from "./decision-replay-identity.ts";

export const DECISION_KINDS = ["change_specification", "no_action", "reviewer_disagreement"] as const;
export const DECISION_STATES = ["DO_NOW", "TEST_FIRST", "DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"] as const;
export const NO_ACTION_STATES = ["DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"] as const;
export const SAVE_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DecisionState = typeof DECISION_STATES[number];
export type DecisionScope = { organizationId: string; projectId: string; actorId?: string };

export type SaveDecisionInput = {
  baselineRunId: string;
  saveKey: string;
  kind: LoopDecisionKind;
  decisionState: DecisionState;
  rationale: string;
  ownerId: string | null;
  ownerRole: string | null;
  actionSummary: string | null;
  dueDate: string | null;
  changeSpecificationId: string | null;
  approve: boolean;
};

export type CompleteActionInput = {
  decisionId: string;
  ownerId: string | null;
  ownerRole: string | null;
  actionSummary: string | null;
  dueDate: string | null;
  approve: boolean;
};

export type RecordDecisionRow = {
  id: string;
  organization_id: string;
  project_id: string;
  baseline_run_id: string;
  save_key: string;
  decision_kind: LoopDecisionKind;
  decision_state: DecisionState;
  rationale: string;
  change_specification_id: string | null;
  decided_by: string;
  decided_at: string;
  approved_by: string | null;
  approved_at: string | null;
  owner_id: string | null;
  owner_role: string | null;
  action_summary: string | null;
  due_date: string | null;
};

export const RECORD_DECISION_COLUMNS = "id,organization_id,project_id,baseline_run_id,save_key,decision_kind,decision_state,rationale,change_specification_id,decided_by,decided_at,approved_by,approved_at,owner_id,owner_role,action_summary,due_date";

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };
const text = (value: unknown) => (typeof value === "string" ? value.normalize("NFKC").replace(/\s+/g, " ").trim() : "");
const optionalText = (value: unknown) => text(value) || null;

function validDate(value: string) {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateActionFields(body: Record<string, unknown>): Validation<Pick<SaveDecisionInput, "ownerId" | "ownerRole" | "actionSummary" | "dueDate">> {
  const ownerId = optionalText(body.ownerId);
  if (ownerId && !UUID.test(ownerId)) return { ok: false, error: "Decision owner must be a workspace member ID." };
  const ownerRole = optionalText(body.ownerRole);
  if (ownerRole && (ownerRole.length < 2 || ownerRole.length > 80)) return { ok: false, error: "Owner role must be 2–80 characters." };
  const actionSummary = optionalText(body.actionSummary);
  if (actionSummary && (actionSummary.length < 3 || actionSummary.length > 2000)) return { ok: false, error: "Action must be 3–2,000 characters." };
  const dueDate = optionalText(body.dueDate);
  if (dueDate && !validDate(dueDate)) return { ok: false, error: "Due date must be a calendar date (YYYY-MM-DD)." };
  return { ok: true, value: { ownerId, ownerRole, actionSummary, dueDate } };
}

/** Validate a POSTed decision. `baselineRunId` comes from the route path, not the body. */
export function validateSaveDecisionInput(baselineRunId: string, raw: unknown): Validation<SaveDecisionInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Send a valid decision." };
  const body = raw as Record<string, unknown>;
  if (!UUID.test(baselineRunId)) return { ok: false, error: "A valid Recommendation Record ID is required." };
  const saveKey = typeof body.saveKey === "string" ? body.saveKey : "";
  if (!SAVE_KEY_PATTERN.test(saveKey)) return { ok: false, error: "A client save key (16–128 letters, digits, - or _) is required so a retry cannot duplicate the decision." };
  const kind = body.kind as LoopDecisionKind;
  if (!(DECISION_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Choose a Change Specification decision, explicit no-action, or reviewer disagreement." };
  const decisionState = body.decisionState as DecisionState;
  if (!(DECISION_STATES as readonly string[]).includes(decisionState)) return { ok: false, error: "Choose a valid decision state." };
  if (kind === "no_action" && !(NO_ACTION_STATES as readonly string[]).includes(decisionState)) {
    return { ok: false, error: "An explicit no-action decision must be Do not do, Monitor only, or Insufficient evidence." };
  }
  const rationale = text(body.rationale);
  if (rationale.length < 3 || rationale.length > 2000) return { ok: false, error: "Write the decision rationale (3–2,000 characters)." };
  const action = validateActionFields(body);
  if (!action.ok) return action;
  const changeSpecificationId = optionalText(body.changeSpecificationId);
  if (changeSpecificationId && !UUID.test(changeSpecificationId)) return { ok: false, error: "Linked Change Specification ID is invalid." };
  const approve = body.approve === true;
  if (kind !== "change_specification") {
    const { ownerId, ownerRole, actionSummary, dueDate } = action.value;
    if (ownerId || ownerRole || actionSummary || dueDate || changeSpecificationId || approve) {
      return { ok: false, error: "Explicit no-action and reviewer disagreement are complete with a rationale; they never take an owner, action, date or approval." };
    }
  }
  if (approve && (decisionState === "DO_NOW" || decisionState === "TEST_FIRST")) {
    const gaps = actionGaps(action.value);
    if (gaps.length) return { ok: false, error: `Approving an actionable decision needs: ${gaps.join(", ")}.` };
  }
  return { ok: true, value: { baselineRunId, saveKey, kind, decisionState, rationale, ...action.value, changeSpecificationId, approve } };
}

export function validateCompleteActionInput(raw: unknown): Validation<CompleteActionInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Send a valid decision update." };
  const body = raw as Record<string, unknown>;
  const decisionId = typeof body.decisionId === "string" ? body.decisionId : "";
  if (!UUID.test(decisionId)) return { ok: false, error: "A valid decision ID is required." };
  const action = validateActionFields(body);
  if (!action.ok) return action;
  const approve = body.approve === true;
  return { ok: true, value: { decisionId, ...action.value, approve } };
}

function actionGaps(value: { ownerId: string | null; ownerRole: string | null; actionSummary: string | null; dueDate: string | null }) {
  const gaps: string[] = [];
  if (!value.ownerId && !value.ownerRole) gaps.push("owner");
  if (!value.actionSummary) gaps.push("action");
  if (!value.dueDate) gaps.push("due date");
  return gaps;
}

export function saveDecisionRpcBody(scope: DecisionScope, input: SaveDecisionInput) {
  return {
    p_organization_id: scope.organizationId,
    p_project_id: scope.projectId,
    p_baseline_run_id: input.baselineRunId,
    p_save_key: input.saveKey,
    p_decision_kind: input.kind,
    p_decision_state: input.decisionState,
    p_rationale: input.rationale,
    p_owner_id: input.ownerId,
    p_owner_role: input.ownerRole,
    p_action_summary: input.actionSummary,
    p_due_date: input.dueDate,
    p_change_specification_id: input.changeSpecificationId,
    p_approve: input.approve,
  };
}

export function completeActionRpcBody(scope: DecisionScope, input: CompleteActionInput) {
  return {
    p_decision_id: input.decisionId,
    p_organization_id: scope.organizationId,
    p_project_id: scope.projectId,
    p_owner_id: input.ownerId,
    p_owner_role: input.ownerRole,
    p_action_summary: input.actionSummary,
    p_due_date: input.dueDate,
    p_approve: input.approve,
  };
}

export function decisionRowToLoop(row: RecordDecisionRow): LoopDecision {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    baselineRunId: row.baseline_run_id,
    kind: row.decision_kind,
    decisionState: row.decision_state,
    rationale: row.rationale,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    ownerId: row.owner_id,
    ownerRole: row.owner_role,
    actionSummary: row.action_summary,
    dueDate: row.due_date,
    saveKey: row.save_key,
  };
}

type ErrorShape = { status?: unknown; code?: unknown };
const shape = (error: unknown): ErrorShape => (error && typeof error === "object" ? error as ErrorShape : {});

/**
 * The proposal migration is not applied in this database yet: unknown table
 * (PGRST205 / 42P01), unknown RPC (PGRST202) or unknown column (42703).
 */
export function isDecisionPersistencePending(error: unknown): boolean {
  const { status, code } = shape(error);
  return code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42703"
    || (status === 404 && typeof code === "string" && code.startsWith("PGRST2"));
}

export const PERSISTENCE_PENDING = {
  status: 503,
  code: "decision_persistence_pending",
  error: "Decision saving is not enabled in this environment yet (database migration pending). Nothing was saved.",
} as const;

export function decisionDbFailure(error: unknown): { status: number; code?: string; error: string } | null {
  if (isDecisionPersistencePending(error)) return { ...PERSISTENCE_PENDING };
  const { status, code } = shape(error);
  if (code === "PT401" || status === 401) return { status: 401, error: "Sign in again to save decisions." };
  if (code === "PT403" || status === 403 || code === "42501") return { status: 403, error: "Your workspace role cannot make this decision change." };
  if (code === "PT404" || status === 404) return { status: 404, error: "Reviewed Recommendation Record or decision not found in the active project." };
  if (code === "PT409" || status === 409 || code === "23505") return { status: 409, code: "decision_conflict", error: "This decision conflicts with a saved one (same save key for a different Record, or the decision is already approved)." };
  if (code === "PT400" || code === "23514" || status === 400) return { status: 400, error: "The database rejected this decision as incomplete or inconsistent. Nothing was saved." };
  return null;
}

/** A failure after which the write may or may not have committed (lost ACK). */
export function isAmbiguousWriteFailure(error: unknown): boolean {
  const { status } = shape(error);
  if (typeof status === "number") return status >= 500 || status === 408;
  return true; // network error / timeout: no HTTP status at all
}

export type SaveDecisionDeps = {
  rpc: (body: ReturnType<typeof saveDecisionRpcBody>) => Promise<{ id: string; outcome: "created" | "existing" }>;
  readBySaveKey: (saveKey: string) => Promise<RecordDecisionRow[]>;
};

export type SaveDecisionResult =
  | { ok: true; id: string; outcome: "created" | "existing" | "reconciled" }
  | { ok: false; status: number; code?: string; error: string };

export async function saveRecordDecision(deps: SaveDecisionDeps, scope: DecisionScope, input: SaveDecisionInput): Promise<SaveDecisionResult> {
  const confirm = async (outcome: "existing" | "reconciled"): Promise<SaveDecisionResult> => {
    const replay = await reconcilePersistedDecisionReplay(deps.readBySaveKey, scope, input.saveKey, input);
    if (replay.state === "match") return { ok: true, id: replay.id, outcome };
    if (replay.state === "conflict") {
      return { ok: false, status: 409, code: "decision_conflict", error: "This save key belongs to a different persisted decision payload. Review the saved decision before taking another action." };
    }
    return { ok: false, status: 503, code: "decision_save_unconfirmed", error: "The save could not be confirmed. Reload the Record or retry with the same save key; do not assume it was saved." };
  };

  try {
    const saved = await deps.rpc(saveDecisionRpcBody(scope, input));
    if (saved.outcome === "created") return { ok: true, id: saved.id, outcome: "created" };
    // The SQL RPC currently deduplicates by key, Record and kind alone. A
    // reused key with a changed state/rationale/owner must NOT get a 200.
    return await confirm("existing");
  } catch (error) {
    const mapped = decisionDbFailure(error);
    if (mapped) return { ok: false, ...mapped };
    if (!isAmbiguousWriteFailure(error)) throw error;
    // Lost acknowledgement: read the whole saved payload and fail closed on
    // changed content, wrong project, missing row or an unreadable database.
    // Never re-post here; any user retry must use the same save key.
    return await confirm("reconciled");
  }
}
