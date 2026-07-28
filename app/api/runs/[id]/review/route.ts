import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { generateReviewedSourceMap } from "@/lib/source-map-generation";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can approve collected evidence." }, { status: 403 });
  const { id } = await params;
  const runs = await supabaseRest<Array<{ id: string; status: string; category_id: string; organization_id: string; created_by: string | null }>>(
    `runs?select=id,status,category_id,organization_id,created_by&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const run = runs[0];
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  if (run.status !== "review") return NextResponse.json({ error: "Only a run waiting for review can be approved." }, { status: 409 });
  const answerRows = await supabaseRest<Array<{ id: string }>>(
    `run_answers?select=id&run_id=eq.${run.id}&organization_id=eq.${context.organizationId}`,
    { token: viewer.accessToken },
  );
  if (!answerRows.length) return NextResponse.json({ error: "This run has no collected answers to review." }, { status: 409 });
  const answerIds = answerRows.map((row) => row.id);

  await Promise.all([
    supabaseRest(`run_answers?run_id=eq.${run.id}&organization_id=eq.${context.organizationId}`, {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { review_status: "verified" },
    }),
    supabaseRest(
      `source_observations?organization_id=eq.${context.organizationId}&run_answer_id=in.(${answerIds.join(",")})`,
      { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { review_status: "verified", reviewer_id: viewer.id } },
    ),
  ]);

  const [{ sourceMapId, sourceCount }, failedAttempts] = await Promise.all([
    generateReviewedSourceMap(run),
    supabaseRest<Array<{ id: string }>>(
      `run_attempts?select=id&organization_id=eq.${context.organizationId}&run_id=eq.${run.id}&status=in.(failed,rate_limited,excluded)`,
      { token: viewer.accessToken },
    ),
  ]);
  const finalStatus = failedAttempts.length ? "partial" : "complete";
  await Promise.all([
    supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${context.organizationId}`, {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: { status: finalStatus },
    }),
    supabaseRest("audit_logs", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        actor_id: viewer.id,
        action: "run.review.approved",
        entity_type: "run",
        entity_id: run.id,
        after_state: { status: finalStatus, source_map_id: sourceMapId, verified_sources: sourceCount },
      },
    }),
  ]);
  return NextResponse.json({ ok: true, status: finalStatus, sourceMapId, sourceCount });
}
