import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryOrganizationId } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { ACTIVE_PROJECT_COOKIE, setActiveProjectCookie } from "@/lib/session-cookies";
import { supabaseRest } from "@/lib/supabase-rest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "The fictional demo has one fixed project." }, { status: 409 });

  let body: { projectId?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "The project selection is not valid JSON." }, { status: 400 });
  }
  const projectId = body.projectId?.trim() || "";
  if (!UUID.test(projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });

  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const projects = await supabaseRest<Array<{ id: string; name: string }>>(
    `projects?select=id,name&id=eq.${encodeURIComponent(projectId)}&organization_id=eq.${organizationId}&status=eq.active&limit=1`,
    { token: viewer.accessToken },
  );
  const project = projects[0];
  if (!project) return NextResponse.json({ error: "Project not found in this organization." }, { status: 404 });

  const response = NextResponse.json({ ok: true, project: { id: project.id, name: project.name }, cookie: ACTIVE_PROJECT_COOKIE });
  setActiveProjectCookie(response, project.id);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
