import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import type { EntryRoute, SourceMapEntry } from "@/lib/types";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { reviewedOpportunityBridge } from "@/lib/reviewed-opportunity";
import { supabaseRest } from "@/lib/supabase-rest";
import { sendWorkspaceEmailAlert } from "@/lib/workspace-email-alerts";
import { queueWorkspaceWebhook } from "@/lib/workspace-event-queue";

const crawlerValues: SourceMapEntry["crawlerAccess"][] = ["open", "partial", "blocked"];
const feasibilityValues: SourceMapEntry["feasibility"][] = ["high", "medium", "low", "unknown"];
const influenceValues: SourceMapEntry["influence"][] = ["high", "medium", "low", "emerging", "unknown"];
const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

type OpportunityRow = {
  id: string;
  status: "open" | "qualified" | "approved" | "in_progress" | "won" | "lost" | "archived";
};

type OpportunitySyncResult = {
  id: string | null;
  status: OpportunityRow["status"] | "not_created";
  action: "created" | "refreshed" | "archived" | "none";
};

async function syncReviewedOpportunity(input: {
  token: string;
  organizationId: string;
  projectId: string;
  sourceId: string;
  pageTitle: string | null;
  canonicalUrl: string;
  route: EntryRoute;
  clientPresent: boolean;
  actorId: string;
}): Promise<OpportunitySyncResult> {
  const bridge = reviewedOpportunityBridge({
    pageTitle: input.pageTitle,
    canonicalUrl: input.canonicalUrl,
    route: input.route,
    clientPresent: input.clientPresent,
  });
  // `source_route_id is null` is the marker for the deterministic opportunity
  // synchronized from Source Map review. Route-specific/manual graph rows keep
  // their own identity and are not silently overwritten here.
  const existing = await supabaseRest<OpportunityRow[]>(
    `opportunities?select=id,status&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&source_id=eq.${input.sourceId}&source_route_id=is.null&order=created_at.asc&limit=1`,
    { token: input.token },
  );
  const current = existing[0] || null;

  if (!bridge.actionable) {
    if (!current || ["won", "lost", "archived"].includes(current.status)) {
      return { id: current?.id || null, status: current?.status || "not_created", action: "none" };
    }
    await supabaseRest(`opportunities?id=eq.${current.id}&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}`, {
      method: "PATCH",
      token: input.token,
      prefer: "return=minimal",
      body: { status: "archived", title: bridge.title, next_action: bridge.nextAction },
    });
    return { id: current.id, status: "archived", action: "archived" };
  }

  if (current) {
    const nextStatus: OpportunityRow["status"] = current.status === "archived" ? "open" : current.status;
    await supabaseRest(`opportunities?id=eq.${current.id}&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}`, {
      method: "PATCH",
      token: input.token,
      prefer: "return=minimal",
      body: { status: nextStatus, title: bridge.title, next_action: bridge.nextAction },
    });
    return { id: current.id, status: nextStatus, action: "refreshed" };
  }

  const created = await supabaseRest<OpportunityRow[]>("opportunities", {
    method: "POST",
    token: input.token,
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      project_id: input.projectId,
      source_id: input.sourceId,
      source_route_id: null,
      title: bridge.title,
      status: "open",
      // These legacy numeric fields are deliberately left at the neutral zero
      // boundary. Human-reviewed evidence counts and route state, not an opaque
      // composite score, drive the customer-facing Opportunities experience.
      influence_score: bridge.influenceScore,
      feasibility_score: bridge.feasibilityScore,
      owner_id: input.actorId,
      next_action: bridge.nextAction,
    },
  });
  return { id: created[0]?.id || null, status: "open", action: "created" };
}

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
    influence?: SourceMapEntry["influence"];
    note?: string;
  };
  if (!crawlerValues.includes(body.crawlerAccess as SourceMapEntry["crawlerAccess"])) return NextResponse.json({ error: "Record a reviewed crawler state." }, { status: 400 });
  if (!feasibilityValues.includes(body.feasibility as SourceMapEntry["feasibility"])) return NextResponse.json({ error: "Choose a valid feasibility state." }, { status: 400 });
  if (!influenceValues.includes(body.influence as SourceMapEntry["influence"])) return NextResponse.json({ error: "Choose a valid influence state." }, { status: 400 });
  if (!routes.includes(body.route as EntryRoute)) return NextResponse.json({ error: "Choose a legitimate source route." }, { status: 400 });
  const competitors = (body.competitors || []).map((value) => clean(value, 120)).filter(Boolean).slice(0, 20);
  const note = clean(body.note, 2000);

  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo", reviewedAt: new Date().toISOString() });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Complete onboarding before reviewing a source." }, { status: 409 });
  if (!role || role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can review sources." }, { status: 403 });
  const organizationId = context.organizationId;
  const rows = await supabaseRest<Array<{ id: string; source_id: string; client_present: boolean; competitors_present: string[]; entry_route: string | null; feasibility: string; influence: string; analyst_note: string | null }>>(
    `source_map_entries?select=id,source_id,client_present,competitors_present,entry_route,feasibility,influence,analyst_note&id=eq.${encodeURIComponent(id)}&organization_id=eq.${organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const entry = rows[0];
  if (!entry) return NextResponse.json({ error: "Source record not found in this workspace." }, { status: 404 });
  const sourceRows = await supabaseRest<Array<{ id: string; canonical_url: string; page_title: string | null }>>(
    `sources?select=id,canonical_url,page_title&id=eq.${entry.source_id}&organization_id=eq.${organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const source = sourceRows[0];
  if (!source) return NextResponse.json({ error: "The reviewed Source Map record no longer has a source in this workspace." }, { status: 409 });

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
      body: { client_present: Boolean(body.clientPresent), competitors_present: competitors, entry_route: body.route, feasibility: body.feasibility, influence: body.influence, analyst_note: note || null },
    }),
  ]);

  const opportunity = await syncReviewedOpportunity({
    token: viewer.accessToken,
    organizationId,
    projectId: context.projectId,
    sourceId: source.id,
    pageTitle: source.page_title,
    canonicalUrl: source.canonical_url,
    route: body.route as EntryRoute,
    clientPresent: Boolean(body.clientPresent),
    actorId: viewer.id,
  });

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
      after_state: {
        crawler_access: body.crawlerAccess,
        client_present: Boolean(body.clientPresent),
        competitors_present: competitors,
        entry_route: body.route,
        feasibility: body.feasibility,
        influence: body.influence,
        analyst_note: note || null,
        reviewed_at: reviewedAt,
        opportunity_sync: opportunity,
      },
    },
  });
  if (entry.client_present !== Boolean(body.clientPresent)) {
    const appeared = Boolean(body.clientPresent);
    await sendWorkspaceEmailAlert({
      organizationId,
      userId: viewer.id,
      eventKey: `${appeared ? "brand_new_source" : "brand_lost_source"}:${entry.id}:${reviewedAt.slice(0, 10)}`,
      kind: appeared ? "brand_new_source" : "brand_lost_source",
      subject: appeared ? "Your brand was verified on a reviewed source" : "Your brand is no longer verified on a reviewed source",
      text: appeared
        ? "A workspace reviewer verified that your brand appears on a cited source. Open the reviewed record to inspect the dated evidence and limitations."
        : "A workspace reviewer changed a cited source to show that your brand is not present. Open the reviewed record before deciding what action to take.",
      href: `/app/sources/${entry.id}`,
    });
  }
  await queueWorkspaceWebhook({ organizationId, eventKey: `source.reviewed:${entry.id}:${reviewedAt}`, eventType: "source.reviewed", occurredAt: reviewedAt, href: `/app/sources/${entry.id}` }).catch(() => undefined);
  return NextResponse.json({ ok: true, reviewedAt, opportunity });
}
