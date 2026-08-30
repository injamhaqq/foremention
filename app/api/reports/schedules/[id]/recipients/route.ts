import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { createReportUnsubscribeToken, hashReportUnsubscribeToken, safeReportUnsubscribePath } from "@/lib/report-recipient";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const canManage = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const HEADERS = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" };

type RecipientRow = {
  id: string;
  schedule_id: string;
  email: string;
  display_name: string | null;
  active: boolean;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  created_at: string;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/reports");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot view report recipients." }, { status: 403, headers: HEADERS });
  const { id } = await params;
  const rows = await supabaseRest<RecipientRow[]>(`report_recipients?select=id,schedule_id,email,display_name,active,unsubscribed_at,unsubscribe_reason,created_at&schedule_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=200`, { token: viewer.accessToken });
  return NextResponse.json({ data: rows }, { headers: HEADERS });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: HEADERS });
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Recipients are not persisted in the fictional demo." }, { status: 409, headers: HEADERS });
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage report recipients." }, { status: 403, headers: HEADERS });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404, headers: HEADERS });
  const { id } = await params;
  const schedules = await supabaseRest<Array<{ id: string }>>(`report_schedules?select=id&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken });
  if (!schedules[0]) return NextResponse.json({ error: "Schedule not found." }, { status: 404, headers: HEADERS });
  const body = await request.json().catch(() => ({})) as { email?: string; displayName?: string | null };
  const email = body.email?.trim().toLowerCase() || "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400, headers: HEADERS });
  const rawToken = createReportUnsubscribeToken();
  const tokenHash = await hashReportUnsubscribeToken(rawToken);
  const rows = await supabaseRest<RecipientRow[]>("report_recipients", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      schedule_id: id,
      email,
      display_name: body.displayName?.trim().slice(0, 120) || null,
      active: true,
      unsubscribe_token_hash: tokenHash,
      created_by: viewer.id,
    },
  });
  return NextResponse.json({ data: { recipient: rows[0], unsubscribePath: safeReportUnsubscribePath(rawToken) } }, { status: 201, headers: HEADERS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: HEADERS });
  const viewer = await requireViewer("/app/reports");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage report recipients." }, { status: 403, headers: HEADERS });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { recipientId?: string };
  if (!body.recipientId) return NextResponse.json({ error: "Recipient id is required." }, { status: 400, headers: HEADERS });
  const now = new Date().toISOString();
  const rows = await supabaseRest<RecipientRow[]>(`report_recipients?id=eq.${encodeURIComponent(body.recipientId)}&schedule_id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: { active: false, unsubscribed_at: now, unsubscribe_reason: "workspace_removed" },
  });
  if (!rows[0]) return NextResponse.json({ error: "Recipient not found." }, { status: 404, headers: HEADERS });
  return NextResponse.json({ data: rows[0] }, { headers: HEADERS });
}
