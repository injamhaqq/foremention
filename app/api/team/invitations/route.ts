import { NextResponse } from "next/server";
import { createOpaqueToken, sha256Hex } from "@/lib/account-security";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadTeam, loadWorkspaceContext, type WorkspaceRole } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const allowedRoles = new Set<Exclude<WorkspaceRole, "owner">>(["admin", "analyst", "viewer"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadTeam(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") {
    return NextResponse.json({ error: "Team invitations are disabled in the fictional demo." }, { status: 409 });
  }
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Only owners and admins can invite teammates." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { email?: string; role?: Exclude<WorkspaceRole, "owner"> };
  const email = String(body.email || "").trim().toLowerCase().slice(0, 320);
  const invitedRole = body.role;
  if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid teammate email." }, { status: 400 });
  if (!invitedRole || !allowedRoles.has(invitedRole)) {
    return NextResponse.json({ error: "Choose admin, analyst, or viewer access." }, { status: 400 });
  }
  if (email === viewer.email.toLowerCase()) {
    return NextResponse.json({ error: "You already belong to this workspace." }, { status: 409 });
  }

  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseRest(
    `invitations?organization_id=eq.${context.organizationId}&email=eq.${encodeURIComponent(email)}&status=eq.pending`,
    {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { status: "revoked" },
    },
  );
  const rows = await supabaseRest<Array<{ id: string }>>("invitations", {
    method: "POST",
    serviceRole: true,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      email,
      role: invitedRole,
      token_hash: tokenHash,
      invited_by: viewer.id,
      status: "pending",
      expires_at: expiresAt,
    },
  });
  const invitationId = rows[0]?.id;
  if (!invitationId) return NextResponse.json({ error: "The invitation could not be created." }, { status: 503 });
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: "team.invitation.created",
      entity_type: "invitation",
      entity_id: invitationId,
      after_state: { email, role: invitedRole, expires_at: expiresAt },
    },
  });
  return NextResponse.json({
    data: {
      id: invitationId,
      email,
      role: invitedRole,
      expiresAt,
      shareUrl: `${new URL(request.url).origin}/invite/${token}`,
      emailDelivery: "not_configured",
    },
  }, { status: 201 });
}
