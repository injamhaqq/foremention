import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadPrompts, loadWorkspaceContext } from "@/lib/data";
import { FOUNDATION_ACCESS_LIMITS } from "@/lib/product-limits";
import { supabaseRest } from "@/lib/supabase-rest";

const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadPrompts(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { text?: string; cluster?: string };
  const text = clean(body.text, 1000);
  const clusterName = clean(body.cluster, 80) || "Customer question";
  if (text.length < 10) return NextResponse.json({ error: "Write a specific buyer question with at least 10 characters." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), text, cluster: clusterName, approved: true }, mode: "demo" }, { status: 201 });

  const [context, existing] = await Promise.all([loadWorkspaceContext(viewer), loadPrompts(viewer)]);
  if (!context) return NextResponse.json({ error: "Complete onboarding before adding buyer questions." }, { status: 409 });
  if (existing.length >= FOUNDATION_ACCESS_LIMITS.buyerQuestions) return NextResponse.json({ error: `This access level allows ${FOUNDATION_ACCESS_LIMITS.buyerQuestions} buyer questions. Paid capacity is enabled only after billing activation.` }, { status: 429 });

  let clusterId = context.clusterId;
  if (!clusterId) {
    const clusters = await supabaseRest<Array<{ id: string }>>("prompt_clusters", {
      method: "POST", token: viewer.accessToken, prefer: "return=representation",
      body: { organization_id: context.organizationId, project_id: context.projectId, name: clusterName, intent: "Customer-defined buyer question", buyer_stage: "evaluation", priority: 3 },
    });
    clusterId = clusters[0]?.id || null;
  }
  const rows = await supabaseRest<Array<{ id: string }>>("prompts", {
    method: "POST", token: viewer.accessToken, prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      project_id: context.projectId,
      category_id: context.categoryId,
      cluster_id: clusterId,
      prompt_key: `customer-${crypto.randomUUID().slice(0, 8)}`,
      prompt_text: text,
      buyer_stage: "evaluation",
      locale: "en-US",
      version: 1,
      active: true,
    },
  });
  return NextResponse.json({ data: { id: rows[0].id, text, cluster: clusterName, approved: true } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; active?: boolean };
  if (!body.id || typeof body.active !== "boolean") return NextResponse.json({ error: "Prompt ID and active status are required." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  await supabaseRest(`prompts?id=eq.${body.id}&organization_id=eq.${context.organizationId}`, {
    method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { active: body.active },
  });
  return NextResponse.json({ ok: true });
}
