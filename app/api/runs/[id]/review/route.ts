import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const { id } = await params;
  const runs = await supabaseRest<Array<{ id: string; status: string; category_id: string }>>(
    `runs?select=id,status,category_id&id=eq.${id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const run = runs[0];
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  if (run.status !== "review") return NextResponse.json({ error: "Only a run waiting for review can be approved." }, { status: 409 });

  await Promise.all([
    supabaseRest(`run_answers?run_id=eq.${run.id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { review_status: "verified" } }),
    supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { status: "complete" } }),
  ]);
  const maps = await supabaseRest<Array<{ id: string }>>(`source_maps?select=id&organization_id=eq.${context.organizationId}&category_id=eq.${run.category_id}&status=eq.draft&order=created_at.desc&limit=1`, { token: viewer.accessToken });
  if (maps[0]) await supabaseRest(`source_maps?id=eq.${maps[0].id}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { status: "published" } });
  return NextResponse.json({ ok: true });
}
