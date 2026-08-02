import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPrompts, loadWorkspaceContext } from "@/lib/data";
import { FOUNDATION_ACCESS_LIMITS } from "@/lib/product-limits";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadPrompts(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid buyer-question form." }, { status: 400 });
  const text = cleanText(body.text, 1000);
  const clusterName = cleanText(body.cluster, 80) || "Customer question";
  if (text.length < 10) return NextResponse.json({ error: "Write a specific buyer question with at least 10 characters." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), text, cluster: clusterName, approved: true }, mode: "demo" }, { status: 201 });

  const [context, role, existing] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer), loadPrompts(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Complete onboarding before adding buyer questions." }, { status: 409 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can add buyer questions." }, { status: 403 });
  if (existing.length >= FOUNDATION_ACCESS_LIMITS.buyerQuestions) return NextResponse.json({ error: `This access level allows ${FOUNDATION_ACCESS_LIMITS.buyerQuestions} buyer questions. Paid capacity is enabled only after billing activation.` }, { status: 429 });

  let clusterId = context.clusterId;
  if (!clusterId) {
    const clusters = await supabaseRest<Array<{ id: string }>>("prompt_clusters", {
      method: "POST", token: viewer.accessToken, prefer: "return=representation",
      body: { organization_id: context.organizationId, project_id: context.projectId, name: clusterName, intent: "Customer-defined buyer question", buyer_stage: "evaluation", priority: 3 },
    });
    clusterId = clusters[0]?.id || null;
  }
  const rows = await supabaseRest<Array<{ id: string; version: number }>>("prompts", {
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
  await supabaseRest("prompt_versions", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      prompt_id: rows[0].id,
      version: rows[0].version,
      prompt_text: text,
      change_reason: "Created by workspace member",
      created_by: viewer.id,
    },
  });
  return NextResponse.json({ data: { id: rows[0].id, text, cluster: clusterName, approved: true } }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid buyer-question update." }, { status: 400 });
  const hasActive = typeof body.active === "boolean";
  const hasText = typeof body.text === "string";
  const text = hasText ? cleanText(body.text, 1000) : "";
  const id = cleanText(body.id, 36);
  if (!/^[0-9a-f-]{36}$/i.test(id) || (!hasActive && !hasText)) {
    return NextResponse.json({ error: "Prompt ID and at least one change are required." }, { status: 400 });
  }
  if (hasText && text.length < 10) {
    return NextResponse.json({ error: "Write a specific buyer question with at least 10 characters." }, { status: 400 });
  }
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can edit buyer questions." }, { status: 403 });
  const currentRows = await supabaseRest<Array<{ id: string; prompt_text: string; active: boolean; version: number }>>(
    `prompts?select=id,prompt_text,active,version&id=eq.${id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const current = currentRows[0];
  if (!current) return NextResponse.json({ error: "Buyer question not found." }, { status: 404 });
  const nextVersion = hasText && text !== current.prompt_text ? current.version + 1 : current.version;
  const rows = await supabaseRest<Array<{ id: string; prompt_text: string; active: boolean }>>(
      `prompts?id=eq.${id}&organization_id=eq.${context.organizationId}`,
    {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: {
        ...(hasActive ? { active: body.active } : {}),
        ...(hasText ? { prompt_text: text, version: nextVersion } : {}),
      },
    },
  );
  if (nextVersion !== current.version) {
    await supabaseRest("prompt_versions", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        prompt_id: current.id,
        version: nextVersion,
        prompt_text: text,
        change_reason: "Edited by workspace member",
        created_by: viewer.id,
      },
    });
  }
  return NextResponse.json({
    data: {
      id: rows[0].id,
      text: rows[0].prompt_text,
      approved: rows[0].active,
    },
  });
}
