import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPrompts, loadWorkspaceContext } from "@/lib/data";
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

  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Complete onboarding before adding buyer questions." }, { status: 409 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can add buyer questions." }, { status: 403 });
  if (!(["owner", "admin", "analyst"] as string[]).includes(role)) return NextResponse.json({ error: "Only owners and analysts can add buyer questions." }, { status: 403 });
  // The trusted, RLS-protected entitlement is the capacity authority. Do not infer
  // paid access from checkout redirects, requested package names or browser state.
  const entitlementRows = await supabaseRest<Array<{
    max_prompts: number;
    status: string;
    expires_at: string | null;
  }>>(
    `organization_entitlements?select=max_prompts,status,expires_at&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const entitlement = entitlementRows[0];
  const validExpiry = entitlement?.expires_at === null
    || (typeof entitlement?.expires_at === "string"
      && Number.isFinite(Date.parse(entitlement.expires_at))
      && Date.parse(entitlement.expires_at) > Date.now());
  const questionLimit = entitlement?.status === "active"
    && Number.isSafeInteger(entitlement.max_prompts)
    && entitlement.max_prompts > 0
    && validExpiry
    ? entitlement.max_prompts
    : 0;
  if (!questionLimit) {
    return NextResponse.json({ error: "Buyer-question access is not active for this workspace." }, { status: 403 });
  }
  // Enforce the organization entitlement across all projects rather than
  // granting every project a fresh quota. Database-atomic admission is a
  // separate migration/reconciliation gate before paid multi-project launch.
  const activeQuestions = await supabaseRest<Array<{ id: string }>>(
    `prompts?select=id&organization_id=eq.${context.organizationId}&active=eq.true&limit=${questionLimit + 1}`,
    { token: viewer.accessToken },
  );
  if (activeQuestions.length >= questionLimit) {
    return NextResponse.json({
      error: `This workspace has reached its ${questionLimit}-question entitlement. Additional capacity requires verified plan activation.`,
    }, { status: 429 });
  }

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
  if (!(["owner", "admin", "analyst"] as string[]).includes(role)) {
    return NextResponse.json({ error: "Only owners and analysts can edit buyer questions." }, { status: 403 });
  }

  const scopedPrompt = await supabaseRest<Array<{ id: string; active: boolean }>>(
    `prompts?select=id,active&id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  if (!scopedPrompt[0]) return NextResponse.json({ error: "Buyer question not found." }, { status: 404 });

  // Reactivation must obey the same organization capacity as creation.
  // This read-side guard does not replace atomic database enforcement.
  if (hasActive && body.active === true && !scopedPrompt[0].active) {
    const entitlements = await supabaseRest<Array<{
      max_prompts: number;
      status: string;
      expires_at: string | null;
    }>>(
      `organization_entitlements?select=max_prompts,status,expires_at&organization_id=eq.${context.organizationId}&limit=1`,
      { token: viewer.accessToken },
    );
    const entitlement = entitlements[0];
    const validExpiry = entitlement?.expires_at === null
      || (typeof entitlement?.expires_at === "string"
        && Number.isFinite(Date.parse(entitlement.expires_at))
        && Date.parse(entitlement.expires_at) > Date.now());
    const questionLimit = entitlement?.status === "active"
      && Number.isSafeInteger(entitlement.max_prompts)
      && entitlement.max_prompts > 0
      && validExpiry
      ? entitlement.max_prompts
      : 0;
    if (!questionLimit) {
      return NextResponse.json({ error: "Buyer-question access is not active for this workspace." }, { status: 403 });
    }
    const activeQuestions = await supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${context.organizationId}&active=eq.true&limit=${questionLimit + 1}`,
      { token: viewer.accessToken },
    );
    if (activeQuestions.length >= questionLimit) {
      return NextResponse.json({
        error: `This workspace has reached its ${questionLimit}-question entitlement. Additional capacity requires verified plan activation.`,
      }, { status: 429 });
    }
  }

  const updated = await supabaseRest<{
    id: string;
    prompt_key: string;
    prompt_text: string;
    active: boolean;
    version: number;
  }>("rpc/update_prompt_versioned", {
    method: "POST",
    token: viewer.accessToken,
    body: {
      p_prompt_id: id,
      p_organization_id: context.organizationId,
      p_prompt_text: hasText ? text : null,
      p_active: hasActive ? body.active : null,
      p_change_reason: "Edited by workspace member",
    },
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      text: updated.prompt_text,
      approved: updated.active,
    },
  });
}
