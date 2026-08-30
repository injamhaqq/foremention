import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { computeNextReportRun } from "@/lib/report-scheduling";
import { REPORT_TYPES, type ReportCadence, type ReportType } from "@/lib/reporting";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const canManage = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const CADENCES: ReportCadence[] = ["manual", "weekly", "monthly", "quarterly"];
const HEADERS = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" };

type ScheduleRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  report_type: ReportType;
  name: string;
  cadence: ReportCadence;
  timezone: string;
  source_selector: { runIds?: string[] };
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_report_snapshot_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" }, { headers: HEADERS });
  const rows = await supabaseRest<ScheduleRow[]>("report_schedules?select=id,organization_id,project_id,report_type,name,cadence,timezone,source_selector,enabled,next_run_at,last_run_at,last_report_snapshot_id,created_at,updated_at&order=created_at.desc&limit=100", { token: viewer.accessToken });
  return NextResponse.json({ data: rows }, { headers: HEADERS });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: HEADERS });
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Schedules are not persisted in the fictional demo." }, { status: 409, headers: HEADERS });
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage report schedules." }, { status: 403, headers: HEADERS });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404, headers: HEADERS });
  const body = await request.json().catch(() => ({})) as { name?: string; type?: ReportType; cadence?: ReportCadence; timezone?: string; runIds?: string[]; firstRunAt?: string | null };
  if (!body.type || !REPORT_TYPES.includes(body.type)) return NextResponse.json({ error: "A supported report type is required." }, { status: 400, headers: HEADERS });
  if (!body.cadence || !CADENCES.includes(body.cadence)) return NextResponse.json({ error: "Cadence must be manual, weekly, monthly, or quarterly." }, { status: 400, headers: HEADERS });
  const name = body.name?.trim() || body.type.replaceAll("_", " ");
  if (name.length < 3 || name.length > 120) return NextResponse.json({ error: "Schedule name must be between 3 and 120 characters." }, { status: 400, headers: HEADERS });
  const timezone = body.timezone?.trim() || "UTC";
  if (timezone.length > 80) return NextResponse.json({ error: "Timezone is invalid." }, { status: 400, headers: HEADERS });
  const runIds = Array.isArray(body.runIds) ? Array.from(new Set(body.runIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))).slice(0, 50) : [];
  const firstRun = body.cadence === "manual" ? null : body.firstRunAt && Number.isFinite(Date.parse(body.firstRunAt)) ? new Date(body.firstRunAt) : computeNextReportRun(body.cadence, new Date());
  const rows = await supabaseRest<ScheduleRow[]>("report_schedules", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      project_id: context.projectId,
      report_type: body.type,
      name,
      cadence: body.cadence,
      timezone,
      source_selector: { runIds },
      enabled: true,
      next_run_at: firstRun?.toISOString() || null,
      created_by: viewer.id,
    },
  });
  return NextResponse.json({ data: rows[0] }, { status: 201, headers: HEADERS });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: HEADERS });
  const viewer = await requireViewer("/app/reports");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage report schedules." }, { status: 403, headers: HEADERS });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404, headers: HEADERS });
  const body = await request.json().catch(() => ({})) as { id?: string; enabled?: boolean; nextRunAt?: string | null; name?: string };
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Schedule id is required." }, { status: 400, headers: HEADERS });
  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.nextRunAt === null) patch.next_run_at = null;
  else if (typeof body.nextRunAt === "string" && Number.isFinite(Date.parse(body.nextRunAt))) patch.next_run_at = new Date(body.nextRunAt).toISOString();
  if (typeof body.name === "string" && body.name.trim().length >= 3 && body.name.trim().length <= 120) patch.name = body.name.trim();
  if (!Object.keys(patch).length) return NextResponse.json({ error: "No supported schedule changes were provided." }, { status: 400, headers: HEADERS });
  const rows = await supabaseRest<ScheduleRow[]>(`report_schedules?id=eq.${encodeURIComponent(body.id)}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=representation", body: patch });
  if (!rows[0]) return NextResponse.json({ error: "Schedule not found." }, { status: 404, headers: HEADERS });
  return NextResponse.json({ data: rows[0] }, { headers: HEADERS });
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: HEADERS });
  const viewer = await requireViewer("/app/reports");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!["owner", "admin"].includes(role || "")) return NextResponse.json({ error: "Only workspace owners and admins can delete report schedules." }, { status: 403, headers: HEADERS });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404, headers: HEADERS });
  const body = await request.json().catch(() => ({})) as { id?: string };
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Schedule id is required." }, { status: 400, headers: HEADERS });
  await supabaseRest(`report_schedules?id=eq.${encodeURIComponent(body.id)}&organization_id=eq.${context.organizationId}`, { method: "DELETE", token: viewer.accessToken, prefer: "return=minimal" });
  return NextResponse.json({ data: { deleted: true } }, { headers: HEADERS });
}
