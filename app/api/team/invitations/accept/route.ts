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
    return NextResponse.json({ error: "Sign in with the email address that received the invitation." }, { status: 403 });
  }
  // Invitation possession is bound to the invited mailbox. Never grant
  // membership to an account whose matching email address is unconfirmed.
  if (viewer.emailVerified !== true) {
    return NextResponse.json({ error: "Confirm your email address before accepting this invitation." }, { status: 403 });
  }
  // Chat 01: the preflight above only selects a friendly refusal. The
  // database is the single authority: accept_foremention_invitation row-locks
  // the invitation, re-verifies the confirmed mailbox in auth.users, checks
  // expiry, grants membership without downgrading a higher role, and writes
  // the audit + notification in ONE transaction. Any failure rolls back all
  // of it, so a racing revoke/replay or a late write error can never leave a
  // consumed invite without membership (or membership without consumption).
  // The organization and role are never taken from the request.
  let receipt: Array<{ invitation_id: string; organization_id: string; granted_role: string }>;
  try {
    receipt = await supabaseRest<Array<{ invitation_id: string; organization_id: string; granted_role: string }>>(
      "rpc/accept_foremention_invitation",
      { method: "POST", serviceRole: true, body: { p_token_hash: tokenHash, p_user_id: viewer.id } },
    );
  } catch (error) {
    // The RPC raises SQLSTATE PT409 (PostgREST -> HTTP 409) for every refusal,
    // without saying which check failed or naming the invited mailbox.
    if ((error as { status?: number } | null)?.status === 409) {
      return NextResponse.json({
        error: "This invitation was used, revoked, or has expired. Ask the workspace owner for a new link.",
      }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not confirm this invitation right now. Please try again." }, { status: 503 });
  }
  if (!Array.isArray(receipt) || receipt.length !== 1 || receipt[0].organization_id !== invitation.organization_id) {
    return NextResponse.json({ error: "We could not confirm this invitation. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, next: "/app" });
}
