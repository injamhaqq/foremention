import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadNotifications, loadWorkspaceContext } from "@/lib/data";
import { filterNotificationsToProject, MAX_PROJECT_NOTIFICATION_SCAN, type NotificationScopeRow } from "@/lib/project-notification-scope";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type NotificationMutationRow = NotificationScopeRow & { read_at: string | null };

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

  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean };
  const now = new Date().toISOString();

  if (body.all) {
    const rows = await supabaseRest<NotificationMutationRow[]>(
      `notifications?select=id,event_key,kind,href,read_at&organization_id=eq.${context.organizationId}&user_id=eq.${viewer.id}&read_at=is.null&order=created_at.desc&limit=${MAX_PROJECT_NOTIFICATION_SCAN + 1}`,
      { token: viewer.accessToken },
    );
    const scoped = await filterNotificationsToProject({
      rows,
      organizationId: context.organizationId,
      projectId: context.projectId,
      token: viewer.accessToken,
    });
    if (!scoped) {
      return NextResponse.json({ error: "Active-project alert scope could not be proven within the safety bound." }, { status: 409 });
    }
    for (let index = 0; index < scoped.length; index += 100) {
      const ids = scoped.slice(index, index + 100).map((row) => row.id);
      if (!ids.length) continue;
      await supabaseRest(
        `notifications?id=in.(${ids.join(",")})&organization_id=eq.${context.organizationId}&user_id=eq.${viewer.id}&read_at=is.null`,
        { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { read_at: now } },
      );
    }
    return NextResponse.json({ ok: true, all: true, count: scoped.length });
  }

  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid alert ID." }, { status: 400 });
  const rows = await supabaseRest<NotificationMutationRow[]>(
    `notifications?select=id,event_key,kind,href,read_at&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&user_id=eq.${viewer.id}&limit=1`,
    { token: viewer.accessToken },
  );
  const scoped = await filterNotificationsToProject({
    rows,
    organizationId: context.organizationId,
    projectId: context.projectId,
    token: viewer.accessToken,
  });
  if (!scoped?.[0]) return NextResponse.json({ error: "Alert not found in the active project." }, { status: 404 });

  await supabaseRest(
    `notifications?id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&user_id=eq.${viewer.id}`,
    { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { read_at: now } },
  );
  return NextResponse.json({ ok: true, id });
}
