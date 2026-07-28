import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext, type WorkspaceRole } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const allowedRoles = new Set<WorkspaceRole>(["owner", "admin", "analyst", "viewer"]);

async function ownerContext(viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>) {
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return { error: NextResponse.json({ error: "Workspace not found." }, { status: 404 }) };
  if (role !== "owner") {
    return { error: NextResponse.json({ error: "Only an owner can change member roles or remove access." }, { status: 403 }) };
  }
  return { context };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo roles cannot be changed." }, { status: 409 });
  const resolved = await ownerContext(viewer);
  if ("error" in resolved) return resolved.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { role?: WorkspaceRole };
  if (!/^[0-9a-f-]{36}$/i.test(id) || !body.role || !allowedRoles.has(body.role)) {
    return NextResponse.json({ error: "Choose a valid member and role." }, { status: 400 });
  }
  const members = await supabaseRest<Array<{ user_id: string; role: WorkspaceRole }>>(
    `organization_members?select=user_id,role&organization_id=eq.${resolved.context.organizationId}`,
    { serviceRole: true },
  );
  const target = members.find((member) => member.user_id === id);
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  const ownerCount = members.filter((member) => member.role === "owner").length;
  if (target.role === "owner" && body.role !== "owner" && ownerCount <= 1) {
    return NextResponse.json({ error: "Promote another owner before changing the last owner's role." }, { status: 409 });
  }
  await supabaseRest(
    `organization_members?organization_id=eq.${resolved.context.organizationId}&user_id=eq.${id}`,
    { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { role: body.role } },
  );
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: resolved.context.organizationId,
      actor_id: viewer.id,
      action: "team.member.role_changed",
      entity_type: "organization_member",
      entity_id: id,
      before_state: { role: target.role },
      after_state: { role: body.role },
    },
  });
  return NextResponse.json({ ok: true, role: body.role });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo members cannot be removed." }, { status: 409 });
  const resolved = await ownerContext(viewer);
  if ("error" in resolved) return resolved.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid member ID." }, { status: 400 });
  const members = await supabaseRest<Array<{ user_id: string; role: WorkspaceRole }>>(
    `organization_members?select=user_id,role&organization_id=eq.${resolved.context.organizationId}`,
    { serviceRole: true },
  );
  const target = members.find((member) => member.user_id === id);
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  const ownerCount = members.filter((member) => member.role === "owner").length;
  if (target.role === "owner" && ownerCount <= 1) {
    return NextResponse.json({ error: "The last owner cannot be removed." }, { status: 409 });
  }
  await supabaseRest(
    `organization_members?organization_id=eq.${resolved.context.organizationId}&user_id=eq.${id}`,
    { method: "DELETE", serviceRole: true, prefer: "return=minimal" },
  );
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: resolved.context.organizationId,
      actor_id: viewer.id,
      action: "team.member.removed",
      entity_type: "organization_member",
      entity_id: id,
      before_state: { role: target.role },
    },
  });
  return NextResponse.json({ ok: true });
}
