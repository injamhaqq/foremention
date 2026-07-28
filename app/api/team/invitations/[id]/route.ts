import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo invitations cannot be changed." }, { status: 409 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Only owners and admins can revoke invitations." }, { status: 403 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid invitation ID." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string }>>(
    `invitations?select=id&id=eq.${id}&organization_id=eq.${context.organizationId}&status=eq.pending&limit=1`,
    { serviceRole: true },
  );
  if (!rows[0]) return NextResponse.json({ error: "Pending invitation not found." }, { status: 404 });
  await supabaseRest(`invitations?id=eq.${id}&organization_id=eq.${context.organizationId}&status=eq.pending`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: { status: "revoked" },
  });
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: "team.invitation.revoked",
      entity_type: "invitation",
      entity_id: id,
    },
  });
  return NextResponse.json({ ok: true });
}
