import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
const types = new Set(["direct", "leader", "challenger", "substitute"]);

async function mutableContext() {
  const viewer = await getViewer();
  if (!viewer) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return { error: NextResponse.json({ error: "Workspace not found." }, { status: 404 }) };
  if (role === "viewer") return { error: NextResponse.json({ error: "Viewer access is read-only." }, { status: 403 }) };
  return { viewer, context };
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const resolved = await mutableContext(); if (resolved.error) return resolved.error;
  const { viewer, context } = resolved;
  if (viewer.mode === "demo") return NextResponse.json({ error: "Competitor changes are disabled in the fictional demo." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { name?: string; website?: string; type?: string };
  const name = clean(body.name, 120); const type = clean(body.type, 20) || "direct"; const website = clean(body.website, 500);
  if (name.length < 2 || !types.has(type)) return NextResponse.json({ error: "Enter a competitor name and valid type." }, { status: 400 });
  let normalizedWebsite: string | null = null;
  if (website) { try { const url = new URL(website); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); normalizedWebsite = url.toString(); } catch { return NextResponse.json({ error: "Enter a valid public website URL." }, { status: 400 }); } }
  const count = await supabaseRest<Array<{ id: string }>>(`competitors?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=101`, { token: viewer.accessToken });
  if (count.length >= 100) return NextResponse.json({ error: "This workspace has reached the 100-competitor safety limit." }, { status: 409 });
  try {
    const rows = await supabaseRest<Array<{ id: string }>>("competitors", { method: "POST", token: viewer.accessToken, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, name, website: normalizedWebsite, competitor_type: type, active: true } });
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch { return NextResponse.json({ error: "That competitor is already tracked or could not be saved." }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const resolved = await mutableContext(); if (resolved.error) return resolved.error;
  const { viewer, context } = resolved;
  if (viewer.mode === "demo") return NextResponse.json({ error: "Competitor changes are disabled in the fictional demo." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { id?: string; active?: boolean };
  const id = clean(body.id, 36);
  if (!UUID.test(id) || typeof body.active !== "boolean") return NextResponse.json({ error: "Choose a valid competitor state." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string }>>(`competitors?select=id&id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`, { token: viewer.accessToken });
  if (!rows[0]) return NextResponse.json({ error: "Competitor not found in this workspace." }, { status: 404 });
  await supabaseRest(`competitors?id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { active: body.active, updated_at: new Date().toISOString() } });
  return NextResponse.json({ data: { id, active: body.active } });
}
