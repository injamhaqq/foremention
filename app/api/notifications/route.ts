import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryOrganizationId, loadNotifications } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadNotifications(viewer), mode: viewer.mode });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean };
  const now = new Date().toISOString();
  if (body.all) {
    await supabaseRest(
      `notifications?organization_id=eq.${organizationId}&user_id=eq.${viewer.id}&read_at=is.null`,
      { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { read_at: now } },
    );
    return NextResponse.json({ ok: true, all: true });
  }
  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid alert ID." }, { status: 400 });
  await supabaseRest(
    `notifications?id=eq.${id}&organization_id=eq.${organizationId}&user_id=eq.${viewer.id}`,
    { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { read_at: now } },
  );
  return NextResponse.json({ ok: true, id });
}
