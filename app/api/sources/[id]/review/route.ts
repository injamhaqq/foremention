import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryOrganizationId, getPrimaryWorkspaceRole } from "@/lib/data";
import type { EntryRoute, SourceMapEntry } from "@/lib/types";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const crawlerValues: SourceMapEntry["crawlerAccess"][] = ["open", "partial", "blocked"];
const feasibilityValues: SourceMapEntry["feasibility"][] = ["high", "medium", "low", "unknown"];
const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as {
    crawlerAccess?: SourceMapEntry["crawlerAccess"];
    clientPresent?: boolean;
    competitors?: string[];
    route?: EntryRoute;
    feasibility?: SourceMapEntry["feasibility"];
    note?: string;
  };
  if (!crawlerValues.includes(body.crawlerAccess as SourceMapEntry["crawlerAccess"])) return NextResponse.json({ error: "Record a reviewed crawler state." }, { status: 400 });
  if (!feasibilityValues.includes(body.feasibility as SourceMapEntry["feasibility"])) return NextResponse.json({ error: "Choose a valid feasibility state." }, { status: 400 });
  if (!routes.includes(body.route as EntryRoute)) return NextResponse.json({ error: "Choose a legitimate source route." }, { status: 400 });
  const competitors = (body.competitors || []).map((value) => clean(value, 120)).filter(Boolean).slice(0, 20);
  const note = clean(body.note, 2000);

  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo", reviewedAt: new Date().toISOString() });
  const [organizationId, role] = await Promise.all([getPrimaryOrganizationId(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!organizationId) return NextResponse.json({ error: "Complete onboarding before reviewing a source." }, { status: 409 });
  if (!role || role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can review sources." }, { status: 403 });
  const rows = await supabaseRest<Array<{ id: string; source_id: string; client_present: boolean; competitors_present: string[]; entry_route: string | null; feasibility: string; analyst_note: string | null }>>(
    `source_map_entries?select=id,source_id,client_present,competitors_present,entry_route,feasibility,analyst_note&id=eq.${encodeURIComponent(id)}&organization_id=eq.${organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const entry = rows[0];
  if (!entry) return NextResponse.json({ error: "Source record not found in this workspace." }, { status: 404 });
  const reviewedAt = new Date().toISOString();
  await Promise.all([
    supabaseRest(`sources?id=eq.${entry.source_id}&organization_id=eq.${organizationId}`, {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: { crawler_access: body.crawlerAccess, crawler_checked_at: reviewedAt },
    }),
    supabaseRest(`source_map_entries?id=eq.${entry.id}&organization_id=eq.${organizationId}`, {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: { client_present: Boolean(body.clientPresent), competitors_present: competitors, entry_route: body.route, feasibility: body.feasibility, analyst_note: note || null },
    }),
  ]);
  await supabaseRest("audit_logs", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=minimal",
    body: {
      organization_id: organizationId,
      actor_id: viewer.id,
      action: "source.reviewed",
      entity_type: "source_map_entry",
      entity_id: entry.id,
      before_state: entry,
      after_state: { crawler_access: body.crawlerAccess, client_present: Boolean(body.clientPresent), competitors_present: competitors, entry_route: body.route, feasibility: body.feasibility, analyst_note: note || null, reviewed_at: reviewedAt },
    },
  });
  return NextResponse.json({ ok: true, reviewedAt });
}
