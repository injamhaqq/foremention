import type { Viewer } from "./auth.ts";
import { supabaseRest } from "./supabase-rest.ts";
import type { ReportSnapshot } from "./reporting.ts";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function reportIntegritySha256(report: ReportSnapshot) {
  const canonical = JSON.stringify(report);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return hex(new Uint8Array(digest));
}

export function publicReportSnapshot(report: ReportSnapshot): ReportSnapshot {
  return {
    ...report,
    organizationId: "redacted",
    projectId: null,
    sources: report.sources.map((source) => ({
      ...source,
      actions: source.actions.map((action) => ({ ...action, owner: null })),
    })),
  };
}

export type PersistedReportSnapshotRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  report_type: ReportSnapshot["type"];
  title: string;
  schema_version: string;
  generated_at: string;
  data_as_of: string;
  period_start: string | null;
  period_end: string | null;
  source_record_ids: string[];
  source_run_ids: string[];
  truth: ReportSnapshot["truth"];
  private_payload: ReportSnapshot;
  public_payload: ReportSnapshot;
  executive_summary: string;
  causality_boundary: string;
  integrity_sha256: string;
  created_at: string;
};

export async function persistReportSnapshot(viewer: Viewer, report: ReportSnapshot) {
  if (viewer.mode === "demo") throw new Error("Fictional demo reports cannot be persisted.");
  const integrity = await reportIntegritySha256(report);
  const rows = await supabaseRest<PersistedReportSnapshotRow[]>("report_snapshots", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: {
      id: report.id,
      organization_id: report.organizationId,
      project_id: report.projectId,
      report_type: report.type,
      title: report.title,
      schema_version: report.schemaVersion,
      generated_at: report.generatedAt,
      data_as_of: report.dataAsOf,
      period_start: report.periodStart,
      period_end: report.periodEnd,
      source_record_ids: report.sourceRecordIds,
      source_run_ids: report.sourceRunIds,
      truth: report.truth,
      private_payload: report,
      public_payload: publicReportSnapshot(report),
      executive_summary: report.executiveSummary,
      causality_boundary: report.causalityBoundary,
      integrity_sha256: integrity,
      created_by: viewer.id,
    },
  });
  const row = rows[0];
  if (!row) throw new Error("The report snapshot was not persisted.");
  return row;
}

export async function loadReportSnapshot(viewer: Viewer, reportId: string) {
  if (viewer.mode === "demo") return null;
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) return null;
  const rows = await supabaseRest<PersistedReportSnapshotRow[]>(
    `report_snapshots?select=id,organization_id,project_id,report_type,title,schema_version,generated_at,data_as_of,period_start,period_end,source_record_ids,source_run_ids,truth,private_payload,public_payload,executive_summary,causality_boundary,integrity_sha256,created_at&id=eq.${encodeURIComponent(reportId)}&limit=1`,
    { token: viewer.accessToken },
  );
  return rows[0] || null;
}

export async function listReportSnapshots(viewer: Viewer, limit = 50) {
  if (viewer.mode === "demo") return [] as PersistedReportSnapshotRow[];
  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
  return supabaseRest<PersistedReportSnapshotRow[]>(
    `report_snapshots?select=id,organization_id,project_id,report_type,title,schema_version,generated_at,data_as_of,period_start,period_end,source_record_ids,source_run_ids,truth,private_payload,public_payload,executive_summary,causality_boundary,integrity_sha256,created_at&order=generated_at.desc&limit=${safeLimit}`,
    { token: viewer.accessToken },
  );
}
