import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { inngest } from "@/lib/jobs/inngest";
import { finalizeResolutionFollowUpsForRun } from "@/lib/resolution-follow-ups";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!["owner", "admin", "analyst"].includes(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can cancel runs." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string; status: string; started_at: string | null }>>(
    `runs?select=id,status,started_at&id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const run = rows[0];
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  if (!["queued", "running"].includes(run.status)) {
    return NextResponse.json({ error: "Only a queued or running collection can be cancelled." }, { status: 409 });
  }

  // Fenced cancellation (Chat06): every status write is a compare-and-set on
  // the state this request observed, so a run the collector already moved to
  // review/complete/partial (or another handler settled) is never overwritten.
  const cancelledBody = {
    status: "cancelled",
    completed_at: new Date().toISOString(),
    error_summary: "Collection was cancelled.",
  };
  const scope = `runs?select=id,status&id=eq.${run.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`;
  let settled = false;
  if (!run.started_at) {
    // Atomic server release: only a still-queued, never-started run created by
    // this actor has its reservation deleted (status becomes failed). Other
    // never-started runs are released idempotently by the cancellation job.
    const released = await supabaseRest<boolean>("rpc/release_queued_run_server", {
      method: "POST",
      serviceRole: true,
      body: {
        p_organization_id: context.organizationId,
        p_run_id: run.id,
        p_reason: "Collection was cancelled before it started.",
        p_actor_id: viewer.id,
      },
    });
    if (released === true) {
      const rows = await supabaseRest<Array<{ id: string; status: string }>>(`${scope}&status=eq.failed&started_at=is.null`, {
        method: "PATCH",
        token: viewer.accessToken,
        prefer: "return=representation",
        body: { ...cancelledBody, estimated_max_cost_usd: 0 },
      });
      settled = rows.length > 0;
    }
  }
  if (!settled) {
    const rows = await supabaseRest<Array<{ id: string; status: string }>>(`${scope}&status=in.(queued,running)`, {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: cancelledBody,
    });
    if (!rows.length) {
      return NextResponse.json({ error: "This collection already finished or was settled. Refresh to see its final state." }, { status: 409 });
    }
  }
  await finalizeResolutionFollowUpsForRun({
    organizationId: context.organizationId,
    projectId: context.projectId,
    runId: run.id,
    runStatus: "cancelled",
    recordedBy: viewer.id,
  });
  await inngest.send({
    id: `foremention-run-cancelled-${run.id}`,
    name: "foremention/run.cancelled",
    data: { runId: run.id, organizationId: context.organizationId },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, status: "cancelled" });
}
