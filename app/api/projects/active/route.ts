import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { persistActiveProjectId } from "@/lib/active-project";
import { getPrimaryOrganizationId } from "@/lib/data";
import { cleanText, readJsonObject } from "@/lib/input-validation";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  const projectId = cleanText(body?.projectId, 36);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
  }

  if (viewer.mode === "demo") {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const rows = await supabaseRest<Array<{ id: string }>>(
    `projects?select=id&id=eq.${projectId}&organization_id=eq.${organizationId}&status=eq.active&limit=1`,
    { token: viewer.accessToken },
  );
  if (!rows[0]) return NextResponse.json({ error: "Project not found in this workspace." }, { status: 404 });

  await persistActiveProjectId(rows[0].id);
  return NextResponse.json({ ok: true, projectId: rows[0].id });
}
