import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole } from "@/lib/data";
import { buildReportSourcesForRuns } from "@/lib/report-data";
import { listReportSnapshots, persistReportSnapshot } from "@/lib/report-persistence";
import { REPORT_TYPES, buildReportSnapshot, validateReportTruth, type ReportType } from "@/lib/reporting";
import { isTrustedMutationOrigin } from "@/lib/request-security";

const canCreateReport = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const validIsoOrNull = (value: unknown) => value === null || value === undefined || (typeof value === "string" && Number.isFinite(Date.parse(value)));

export async function GET() {
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" }, { headers: { "cache-control": "private, no-store" } });
  const rows = await listReportSnapshots(viewer);
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      type: row.report_type,
      title: row.title,
      generatedAt: row.generated_at,
      dataAsOf: row.data_as_of,
      sourceRecordCount: row.source_record_ids.length,
      sourceRunCount: row.source_run_ids.length,
      integritySha256: row.integrity_sha256,
    })),
  }, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Fictional demo data cannot be persisted as a customer report." }, { status: 409 });
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canCreateReport(role)) return NextResponse.json({ error: "Your workspace role cannot create report snapshots." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as {
    type?: ReportType;
    title?: string;
    runIds?: string[];
    periodStart?: string | null;
    periodEnd?: string | null;
  };
  if (!body.type || !REPORT_TYPES.includes(body.type)) return NextResponse.json({ error: "A supported report type is required." }, { status: 400 });
  if (!Array.isArray(body.runIds) || body.runIds.length < 1 || body.runIds.length > 50) return NextResponse.json({ error: "Choose between 1 and 50 Recommendation Records." }, { status: 400 });
  if (!validIsoOrNull(body.periodStart) || !validIsoOrNull(body.periodEnd)) return NextResponse.json({ error: "Report period timestamps must be valid dates." }, { status: 400 });
  if (body.periodStart && body.periodEnd && Date.parse(body.periodEnd) < Date.parse(body.periodStart)) return NextResponse.json({ error: "Report period end must not precede its start." }, { status: 400 });

  const sourceData = await buildReportSourcesForRuns(viewer, body.runIds);
  const report = buildReportSnapshot({
    id: crypto.randomUUID(),
    organizationId: sourceData.organizationId,
    projectId: sourceData.projectId,
    type: body.type,
    title: body.title?.trim() || body.type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
    periodStart: body.periodStart || null,
    periodEnd: body.periodEnd || null,
    sources: sourceData.sources,
  });
  const truthIssues = validateReportTruth(report);
  if (truthIssues.length) return NextResponse.json({ error: "The selected data cannot produce a truthful report yet.", issues: truthIssues }, { status: 409 });

  const row = await persistReportSnapshot(viewer, report);
  return NextResponse.json({
    data: {
      id: row.id,
      type: row.report_type,
      title: row.title,
      generatedAt: row.generated_at,
      dataAsOf: row.data_as_of,
      sourceRecordIds: row.source_record_ids,
      integritySha256: row.integrity_sha256,
    },
  }, { status: 201, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
}
