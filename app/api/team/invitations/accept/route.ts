import { NextResponse } from "next/server";
import { sha256Hex } from "@/lib/account-security";
import { getViewer } from "@/lib/auth";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  status: string;
  expires_at: string;
  invited_by: string | null;
};

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in before accepting this invitation." }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Leave the fictional demo before accepting an invitation." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { token?: string };
  const token = String(body.token || "").trim();
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return NextResponse.json({ error: "This invitation link is invalid." }, { status: 400 });
  }
  const tokenHash = await sha256Hex(token);
  const rows = await supabaseRest<InvitationRow[]>(
    `invitations?select=id,organization_id,email,role,status,expires_at,invited_by&token_hash=eq.${tokenHash}&limit=1`,
    { serviceRole: true },
  );
  const invitation = rows[0];
  if (!invitation || invitation.status !== "pending") {
    return NextResponse.json({ error: "This invitation has already been used or revoked." }, { status: 409 });
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await supabaseRest(`invitations?id=eq.${invitation.id}`, {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { status: "expired" },
    });
    return NextResponse.json({ error: "This invitation has expired. Ask the workspace owner for a new link." }, { status: 410 });
  }
  if (invitation.email.toLowerCase() !== viewer.email.toLowerCase()) {
    return NextResponse.json({ error: `Sign in as ${invitation.email} to accept this invitation.` }, { status: 403 });
  }

  await supabaseRest("organization_members?on_conflict=organization_id,user_id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      organization_id: invitation.organization_id,
      user_id: viewer.id,
      member_email: viewer.email.toLowerCase(),
      role: invitation.role,
      invited_by: invitation.invited_by,
    },
  });
  await supabaseRest(`invitations?id=eq.${invitation.id}&status=eq.pending`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: { status: "accepted", accepted_at: new Date().toISOString() },
  });
  await Promise.all([
    supabaseRest("audit_logs", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        organization_id: invitation.organization_id,
        actor_id: viewer.id,
        action: "team.invitation.accepted",
        entity_type: "invitation",
        entity_id: invitation.id,
        after_state: { role: invitation.role, email: invitation.email },
      },
    }),
    supabaseRest("notifications?on_conflict=organization_id,event_key,user_id", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: {
        organization_id: invitation.organization_id,
        user_id: viewer.id,
        event_key: `workspace-joined:${invitation.id}`,
        kind: "workspace",
        title: "Workspace access confirmed",
        body: `You joined the workspace with ${invitation.role} access.`,
        href: "/app",
      },
    }),
  ]);
  return NextResponse.json({ ok: true, next: "/app" });
}
