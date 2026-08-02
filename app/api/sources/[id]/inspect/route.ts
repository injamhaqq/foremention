import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { hasSignificantSourceChange, inspectSourceUrl, SourceInspectionError } from "@/lib/source-inspection";
import { supabaseRest } from "@/lib/supabase-rest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") {
    return NextResponse.json({ error: "Live page inspection is disabled in the fictional demo." }, { status: 409 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid source record." }, { status: 400 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Complete onboarding before inspecting sources." }, { status: 409 });
  if (!role || role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can inspect live sources." }, { status: 403 });
  const recentWindow = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
  const recentInspections = await supabaseRest<Array<{ id: string }>>(
    `audit_logs?select=id&organization_id=eq.${context.organizationId}&actor_id=eq.${viewer.id}&action=eq.source.inspected&created_at=gte.${recentWindow}&limit=5`,
    { token: viewer.accessToken },
  );
  if (recentInspections.length >= 5) {
    return NextResponse.json({ error: "Please wait a minute before inspecting more sources." }, { status: 429, headers: { "retry-after": "60" } });
  }

  const entries = await supabaseRest<Array<{ id: string; source_id: string }>>(
    `source_map_entries?select=id,source_id&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const entry = entries[0];
  if (!entry) return NextResponse.json({ error: "Source record not found in this workspace." }, { status: 404 });
  const sources = await supabaseRest<Array<{ id: string; canonical_url: string; page_title: string | null; crawler_access: string; crawler_checked_at: string | null; content_signature: string | null; content_length: number | null }>>(
    `sources?select=id,canonical_url,page_title,crawler_access,crawler_checked_at,content_signature,content_length&id=eq.${entry.source_id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const source = sources[0];
  if (!source) return NextResponse.json({ error: "This source does not belong to your workspace." }, { status: 403 });

  try {
    const inspection = await inspectSourceUrl(source.canonical_url);
    const wasReachable = source.crawler_access === "open" || source.crawler_access === "partial";
    const isReachable = inspection.access === "open" || inspection.access === "partial";
    const becameUnreachable = Boolean(source.crawler_checked_at) && wasReachable && !isReachable;
    const changedSignificantly = isReachable && hasSignificantSourceChange(
      { contentSignature: source.content_signature, contentLength: source.content_length },
      { contentSignature: inspection.contentSignature || null, contentLength: inspection.contentLength ?? null },
    );
    const monitoringEvent = becameUnreachable ? "unreachable" : changedSignificantly ? "content_changed" : null;
    const sourceUpdate = {
      crawler_access: inspection.access,
      crawler_checked_at: inspection.checkedAt,
      content_signature: inspection.contentSignature || source.content_signature,
      content_length: inspection.contentLength ?? source.content_length,
      ...(isReachable ? { last_reachable_at: inspection.checkedAt } : {}),
      ...(changedSignificantly ? { last_content_change_at: inspection.checkedAt } : {}),
      ...(inspection.pageTitle ? { page_title: inspection.pageTitle } : {}),
    };
    await Promise.all([
      supabaseRest(`sources?id=eq.${source.id}&organization_id=eq.${context.organizationId}`, {
        method: "PATCH",
        token: viewer.accessToken,
        prefer: "return=minimal",
        body: sourceUpdate,
      }),
      supabaseRest("audit_logs", {
        method: "POST",
        token: viewer.accessToken,
        prefer: "return=minimal",
        body: {
          organization_id: context.organizationId,
          actor_id: viewer.id,
          action: "source.inspected",
          entity_type: "source",
          entity_id: source.id,
          before_state: { crawler_access: source.crawler_access, crawler_checked_at: source.crawler_checked_at, page_title: source.page_title },
          after_state: {
            crawler_access: inspection.access,
            crawler_checked_at: inspection.checkedAt,
            page_title: inspection.pageTitle || source.page_title,
            http_status: inspection.httpStatus,
            content_type: inspection.contentType,
            final_url: inspection.finalUrl,
            redirect_count: inspection.redirectCount,
            monitoring_event: monitoringEvent,
          },
        },
      }),
      ...(monitoringEvent ? [supabaseRest("notifications?on_conflict=organization_id,user_id,event_key", {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: {
          organization_id: context.organizationId,
          user_id: viewer.id,
          event_key: `source_${monitoringEvent}:${source.id}:${inspection.checkedAt.slice(0, 10)}`,
          kind: "workspace",
          title: monitoringEvent === "unreachable" ? "A monitored source became unreachable" : "A monitored source changed materially",
          body: monitoringEvent === "unreachable"
            ? "A previously reachable cited page no longer allowed a safe bounded inspection. Review the source before acting."
            : "The cited page's bounded text fingerprint changed materially since its previous inspection. Review the page before relying on it.",
          href: `/app/sources/${entry.id}`,
        },
      })] : []),
    ]);
    return NextResponse.json({ data: { ...inspection, monitoringEvent } });
  } catch (error) {
    if (error instanceof SourceInspectionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "The source could not be inspected safely. No page content was stored." }, { status: 502 });
  }
}
