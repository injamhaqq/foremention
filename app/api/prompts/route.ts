import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPrompts, loadWorkspaceContext } from "@/lib/data";
import { buyerQuestionCeilingMessage, buyerQuestionLimit, type CapacityEntitlementRow } from "@/lib/product-limits";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";
import { exceedsBuyerQuestionLength } from "@/lib/approved-buyer-questions";
import { updatePromptInProject } from "@/lib/buyer-question-edit";

/**
 * The database RPC/trigger raises PT429 when its atomic, advisory-locked
 * admission rejects the question (a concurrent request won the last slot, or
 * the read-side count was stale). PostgREST returns that as HTTP 429 with code
 * "PT429", but an uncaught throw becomes an opaque Next.js 500 here — so map it
 * back to the same capacity 429 the ordinary read-side guard returns. Any other
 * failure is rethrown unchanged.
 */
function isAtomicCapacityRefusal(error: unknown): boolean {
  if (!(error instanceof SupabaseRequestError)) return false;
  return error.code === "PT429" || (error.code === "P0001" && /prompt limit exceeded/i.test(error.message));
}

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
  // A28: reviewed wording is persisted exactly or rejected, never silently truncated.
  if (exceedsBuyerQuestionLength(body.text)) return NextResponse.json({ error: "Each buyer question must be at most 1,000 characters. Nothing was truncated." }, { status: 400 });
  const text = cleanText(body.text, 1000);
  const clusterName = cleanText(body.cluster, 80) || "Customer question";
  if (text.length < 10) return NextResponse.json({ error: "Write a specific buyer question with at least 10 characters." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), text, cluster: clusterName, approved: true }, mode: "demo" }, { status: 201 });

  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Complete onboarding before adding buyer questions." }, { status: 409 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can add buyer questions." }, { status: 403 });
  if (!(["owner", "admin", "analyst"] as string[]).includes(role)) return NextResponse.json({ error: "Only owners and analysts can add buyer questions." }, { status: 403 });
  // Capacity comes only from the verified-billing entitlement row (Refs #516);
  // an unreadable, inactive or expired entitlement fails closed to Foundation.
  let entitlementRows: CapacityEntitlementRow[] = [];
  try {
    entitlementRows = await supabaseRest<CapacityEntitlementRow[]>(
      "organization_entitlements?select=status,package_key,billing_source,expires_at,max_prompts&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { token: viewer.accessToken },
    );
  } catch {
    entitlementRows = [];
  }
  const questionLimit = buyerQuestionLimit(entitlementRows[0]);
  // Count ACTIVE questions across the whole organization, matching the
  // database admission trigger (Refs #532), which remains the atomic authority
  // for concurrent requests; this read only gives the ordinary case a clear 429.
  const activeQuestions = await supabaseRest<Array<{ id: string }>>(
    "prompts?select=id&organization_id=eq." + encodeURIComponent(context.organizationId) + "&active=eq.true&limit=" + (questionLimit + 1),
    { token: viewer.accessToken },
  );
  if (activeQuestions.length >= questionLimit) return NextResponse.json({ error: buyerQuestionCeilingMessage(entitlementRows[0], questionLimit) }, { status: 429 });

  let clusterId = context.clusterId;
  if (!clusterId) {
    const clusters = await supabaseRest<Array<{ id: string }>>("prompt_clusters", {
      method: "POST", token: viewer.accessToken, prefer: "return=representation",
      body: { organization_id: context.organizationId, project_id: context.projectId, name: clusterName, intent: "Customer-defined buyer question", buyer_stage: "evaluation", priority: 3 },
    });
    clusterId = clusters[0]?.id || null;
  }
  // The database RPC inserts the question and immutable version 1 in one
  // transaction. A failed RPC must never leave a question without its history.
  let created: { id: string; version: number };
  try {
    created = await supabaseRest<{ id: string; version: number }>("rpc/create_prompt_versioned", {
      method: "POST",
      token: viewer.accessToken,
      body: {
        p_organization_id: context.organizationId,
        p_project_id: context.projectId,
        p_category_id: context.categoryId,
        p_cluster_id: clusterId,
        p_prompt_key: `customer-${crypto.randomUUID()}`,
        p_prompt_text: text,
      },
    });
  } catch (error) {
    // A concurrent request can win the last slot between the read-side count
    // above and the atomic admission inside the RPC. Report that as the same
    // capacity 429 rather than an opaque 500.
    if (isAtomicCapacityRefusal(error)) {
      return NextResponse.json({ error: buyerQuestionCeilingMessage(entitlementRows[0], questionLimit) }, { status: 429 });
    }
    throw error;
  }
  return NextResponse.json({ data: { id: created.id, text, cluster: clusterName, approved: true } }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid buyer-question update." }, { status: 400 });
  const hasActive = typeof body.active === "boolean";
  const hasText = typeof body.text === "string";
  if (hasText && exceedsBuyerQuestionLength(body.text)) {
    return NextResponse.json({ error: "Each buyer question must be at most 1,000 characters. Nothing was truncated." }, { status: 400 });
  }
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
    let entitlementRows: CapacityEntitlementRow[] = [];
    try {
      entitlementRows = await supabaseRest<CapacityEntitlementRow[]>(
        "organization_entitlements?select=status,package_key,billing_source,expires_at,max_prompts&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
        { token: viewer.accessToken },
      );
    } catch {
      entitlementRows = [];
    }
    const questionLimit = buyerQuestionLimit(entitlementRows[0]);
    const activeQuestions = await supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${context.organizationId}&active=eq.true&limit=${questionLimit + 1}`,
      { token: viewer.accessToken },
    );
    if (activeQuestions.length >= questionLimit) {
      return NextResponse.json({
        error: buyerQuestionCeilingMessage(entitlementRows[0], questionLimit),
      }, { status: 429 });
    }
  }

  // A11: the database re-checks organization + project + active project
  // (update_prompt_versioned_in_project). The project id is the server-resolved
  // active project, never a client value.
  const result = await updatePromptInProject(
    <T,>(path: string, rpcBody: Record<string, unknown>) => {
      // The edit may only reach the project-bound versioning RPC (A11 phase 2).
      if (path !== "rpc/update_prompt_versioned_in_project") {
        throw new Error("Unexpected buyer-question RPC.");
      }
      return supabaseRest<T>(path, { method: "POST", token: viewer.accessToken, body: rpcBody });
    },
    { organizationId: context.organizationId, projectId: context.projectId },
    { promptId: id, text: hasText ? text : null, active: hasActive ? body.active as boolean : null, changeReason: "Edited by workspace member" },
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const updated = result.row;

  return NextResponse.json({
    data: {
      id: updated.id,
      text: updated.prompt_text,
      approved: updated.active,
    },
  });
}
