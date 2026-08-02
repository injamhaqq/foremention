import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryOrganizationId, loadNotificationPreference } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadNotificationPreference(viewer), mode: viewer.mode });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { emailEnabled?: boolean; weeklyDigestEnabled?: boolean };
  if (typeof body.emailEnabled !== "boolean" || typeof body.weeklyDigestEnabled !== "boolean") return NextResponse.json({ error: "Choose valid email preferences." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: body, mode: "demo" });
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  await supabaseRest("notification_preferences?on_conflict=organization_id,user_id", { method: "POST", token: viewer.accessToken, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: organizationId, user_id: viewer.id, email_enabled: body.emailEnabled, weekly_digest_enabled: body.weeklyDigestEnabled, unsubscribed_at: body.emailEnabled ? null : new Date().toISOString() } });
  return NextResponse.json({ data: { emailEnabled: body.emailEnabled, weeklyDigestEnabled: body.weeklyDigestEnabled, unsubscribed: !body.emailEnabled } });
}
