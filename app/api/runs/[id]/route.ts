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
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can cancel runs." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string; status: string; started_at: string | null }>>(
    `runs?select=id,status,started_at&id=eq.${id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const run = rows[0];
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  if (!["queued", "running"].includes(run.status)) {
    return NextResponse.json({ error: "Only a queued or running collection can be cancelled." }, { status: 409 });
  }

  if (!run.started_at) {
    await supabaseRest("rpc/release_queued_run", {
      method: "POST",
      token: viewer.accessToken,
      body: {
        p_organization_id: context.organizationId,
        p_run_id: run.id,
        p_reason: "Collection was cancelled before it started.",
      },
    });
  }
  await supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${context.organizationId}`, {
    method: "PATCH",
    token: viewer.accessToken,
    prefer: "return=minimal",
    body: {
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_summary: "Collection was cancelled.",
      ...(!run.started_at ? { estimated_max_cost_usd: 0 } : {}),
    },
  });
  await finalizeResolutionFollowUpsForRun({
    organizationId: context.organizationId,
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
