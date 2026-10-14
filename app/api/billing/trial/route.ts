import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";
import { CORE_TRIAL_DAYS } from "@/lib/product-limits";

/**
 * Start the one-time 7-day Core trial (no payment method). The database
 * function `start_core_trial` re-checks ownership, one trial per workspace and
 * per account, and that no paid plan is active, then grants Core capacity with
 * a hard expiry. Nothing here touches billing provider state.
 */
export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces cannot start a trial." }, { status: 403 });
  let role: Awaited<ReturnType<typeof getPrimaryWorkspaceRole>>;
  let context: Awaited<ReturnType<typeof loadWorkspaceContext>>;
  try {
    [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  } catch {
    return NextResponse.json({ error: "Workspace authorization could not be verified." }, { status: 503 });
  }
  if (!context) return NextResponse.json({ error: "Finish creating your workspace before starting a trial." }, { status: 404 });
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can start the Core trial." }, { status: 403 });
  try {
    const result = await supabaseRest<{ packageKey: string; trial: boolean; endsAt: string }>("rpc/start_core_trial", {
      method: "POST",
      token: viewer.accessToken,
      body: { p_organization_id: context.organizationId },
    });
    return NextResponse.json({ data: { ...result, days: CORE_TRIAL_DAYS } }, { status: 201 });
  } catch (error) {
    if (error instanceof SupabaseRequestError && (error.code === "P0001" || error.status === 400 || error.status === 409)) {
      return NextResponse.json({ error: "The free Core trial has already been used for this workspace or account, or a paid plan is active." }, { status: 409 });
    }
    if (error instanceof SupabaseRequestError && (error.code === "42501" || error.status === 403)) {
      return NextResponse.json({ error: "Only the workspace owner can start the Core trial." }, { status: 403 });
    }
    return NextResponse.json({ error: "The trial could not be started right now. Nothing was charged." }, { status: 503 });
  }
}
