import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { readJsonObject } from "@/lib/input-validation";
import {
  completeActionRpcBody,
  decisionDbFailure,
  decisionRowToLoop,
  RECORD_DECISION_COLUMNS,
  saveRecordDecision,
  validateCompleteActionInput,
  validateSaveDecisionInput,
  type RecordDecisionRow,
} from "@/lib/record-decisions";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

// Chat04 CV-05 / A15: saved human decisions on one reviewed Recommendation
// Record. Scope is always the server-resolved active organization + project;
// the database RPCs (Chat04 proposal migration 20261013140000) re-check role,
// project and Record status, and RLS limits reads to members.
const noStore = { "cache-control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const canDecide = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const canApprove = (role: string | null) => ["owner", "admin"].includes(role || "");

function failure(error: unknown) {
  const mapped = decisionDbFailure(error);
  if (!mapped) throw error;
  return NextResponse.json({ error: mapped.error, ...(mapped.code ? { code: mapped.code } : {}) }, { status: mapped.status, headers: noStore });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "A valid Recommendation Record ID is required." }, { status: 400, headers: noStore });
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" }, { headers: noStore });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found.", code: "workspace_setup_required" }, { status: 404, headers: noStore });
  try {
    const rows = await supabaseRest<RecordDecisionRow[]>(
      `record_decisions?select=${RECORD_DECISION_COLUMNS}&baseline_run_id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=decided_at.desc&limit=50`,
      { token: viewer.accessToken },
    );
    return NextResponse.json({ data: rows.map(decisionRowToLoop) }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = validateSaveDecisionInput(id, await readJsonObject(request));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "The demo workspace does not save decisions." }, { status: 409 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found.", code: "workspace_setup_required" }, { status: 404 });
  if (!canDecide(role)) return NextResponse.json({ error: "Only owners, admins and analysts can save decisions." }, { status: 403 });
  if (parsed.value.approve && !canApprove(role)) return NextResponse.json({ error: "Only owners and admins can approve decisions." }, { status: 403 });
  const scope = { organizationId: context.organizationId, projectId: context.projectId, actorId: viewer.id };
  const result = await saveRecordDecision({
    rpc: (body) => supabaseRest("rpc/save_record_decision", { method: "POST", token: viewer.accessToken, body }),
    readBySaveKey: (saveKey) => supabaseRest<RecordDecisionRow[]>(
      `record_decisions?select=${RECORD_DECISION_COLUMNS}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&save_key=eq.${encodeURIComponent(saveKey)}&limit=2`,
      { token: viewer.accessToken },
    ),
  }, scope, parsed.value);
  if (!result.ok) return NextResponse.json({ error: result.error, ...(result.code ? { code: result.code } : {}) }, { status: result.status });
  return NextResponse.json({ data: { id: result.id, outcome: result.outcome } }, { status: result.outcome === "created" ? 201 : 200 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "A valid Recommendation Record ID is required." }, { status: 400 });
  const parsed = validateCompleteActionInput(await readJsonObject(request));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "The demo workspace does not save decisions." }, { status: 409 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found.", code: "workspace_setup_required" }, { status: 404 });
  if (!canDecide(role)) return NextResponse.json({ error: "Only owners, admins and analysts can change decisions." }, { status: 403 });
  if (parsed.value.approve && !canApprove(role)) return NextResponse.json({ error: "Only owners and admins can approve decisions." }, { status: 403 });
  try {
    // The decision must belong to this Record in the active project (RLS-scoped read), then the RPC re-checks.
    const owned = await supabaseRest<Array<{ id: string }>>(
      `record_decisions?select=id&id=eq.${parsed.value.decisionId}&baseline_run_id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    );
    if (!owned[0]) return NextResponse.json({ error: "Decision not found for this Record in the active project." }, { status: 404 });
    const updated = await supabaseRest<{ id: string; approved: boolean }>("rpc/complete_record_decision_action", {
      method: "POST",
      token: viewer.accessToken,
      body: completeActionRpcBody({ organizationId: context.organizationId, projectId: context.projectId }, parsed.value),
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return failure(error);
  }
}
