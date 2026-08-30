"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { REPORT_TYPES, type ReportCadence, type ReportType } from "@/lib/reporting";

export type ReportingRunOption = { id: string; date: string; status: string; answers: number; citations: number };
export type ReportingSnapshotOption = { id: string; type: ReportType; title: string; generatedAt: string; dataAsOf: string; sourceRecordCount: number };
export type ReportingScheduleOption = { id: string; report_type: ReportType; name: string; cadence: ReportCadence; timezone: string; enabled: boolean; next_run_at: string | null };

const LABELS: Record<ReportType, string> = {
  recommendation_record: "Recommendation Record",
  weekly_operator_summary: "Weekly operator summary",
  executive_digest: "Executive digest",
  monthly_review: "Monthly review",
  quarterly_business_review: "Quarterly business review",
  competitor_intelligence_brief: "Competitor intelligence brief",
  action_outcome_report: "Action / outcome report",
  board_ready_summary: "Board-ready summary",
  agency_client_report: "Agency / client report",
};

const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "—";

export function ReportingWorkbench({ runs, reports, schedules, migrationPending = false }: { runs: ReportingRunOption[]; reports: ReportingSnapshotOption[]; schedules: ReportingScheduleOption[]; migrationPending?: boolean }) {
  const router = useRouter();
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>("executive_digest");
  const [reportTitle, setReportTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedCount = selectedRuns.length;
  const canGenerate = !migrationPending && selectedCount > 0 && !busy;
  const selectedRunSummary = useMemo(() => runs.filter((run) => selectedRuns.includes(run.id)), [runs, selectedRuns]);

  const toggleRun = (id: string) => setSelectedRuns((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 50 ? [...current, id] : current);

  async function createReport() {
    if (!canGenerate) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: reportType, title: reportTitle.trim() || undefined, runIds: selectedRuns }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; data?: { id?: string } };
      if (!response.ok) throw new Error(payload.error || "Report generation failed.");
      setMessage(`Report snapshot created${payload.data?.id ? ` · ${payload.data.id.slice(0, 8).toUpperCase()}` : ""}.`);
      setSelectedRuns([]); setReportTitle(""); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report generation failed.");
    } finally { setBusy(false); }
  }

  async function createSchedule(form: FormData) {
    setBusy(true); setMessage(null);
    try {
      const cadence = String(form.get("cadence") || "weekly") as ReportCadence;
      const type = String(form.get("reportType") || "executive_digest") as ReportType;
      const response = await fetch("/api/reports/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: String(form.get("name") || "").trim(), type, cadence, timezone: String(form.get("timezone") || "UTC"), runIds: selectedRuns }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Schedule creation failed.");
      setMessage("Report schedule saved. External email delivery is still gated by provider configuration.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Schedule creation failed.");
    } finally { setBusy(false); }
  }

  async function createShare(reportId: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/reports/${reportId}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expiresInDays: 7 }) });
      const payload = await response.json().catch(() => ({})) as { error?: string; data?: { path?: string; expiresAt?: string } };
      if (!response.ok || !payload.data?.path) throw new Error(payload.error || "Secure link creation failed.");
      setMessage(`Secure link (7 days): ${window.location.origin}${payload.data.path}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secure link creation failed.");
    } finally { setBusy(false); }
  }

  return <>
    {message && <div className="panel" role="status" aria-live="polite"><strong>Reporting status</strong><p>{message}</p></div>}
    <section className="panel">
      <div className="workspace-heading"><div><span className="eyebrow">Manual report</span><h2>Create a frozen communication snapshot</h2><p>Select persisted Recommendation Records. Foremention will carry their evidence/review context forward and withhold unsupported comparison claims.</p></div></div>
      {migrationPending ? <div className="empty-state"><h3>Reporting tables are not enabled yet.</h3><p>Apply the pending additive reporting migration before creating customer report snapshots. Existing Recommendation Records are unaffected.</p></div> : <>
        <div className="form-grid">
          <label><span>Report type</span><select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>{REPORT_TYPES.map((type) => <option key={type} value={type}>{LABELS[type]}</option>)}</select></label>
          <label><span>Optional report title</span><input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} maxLength={180} placeholder={LABELS[reportType]} /></label>
        </div>
        <fieldset><legend>Recommendation Records · choose up to 50</legend><div className="reporting-run-picker">{runs.length ? runs.map((run) => <label key={run.id}><input type="checkbox" checked={selectedRuns.includes(run.id)} onChange={() => toggleRun(run.id)} /><span><strong>{run.id.slice(0, 8).toUpperCase()}</strong> · {run.date}<small>{run.status} · {run.answers} answers · {run.citations} returned citations</small></span></label>) : <p>No Recommendation Records are available yet.</p>}</div></fieldset>
        <p className="table-caption">Selected: {selectedCount}{selectedRunSummary.some((run) => !["complete", "partial"].includes(run.status)) ? " · Some records are not finalized; truth validation may withhold the report." : ""}</p>
        <button className="button button--ink" type="button" disabled={!canGenerate} onClick={createReport}>{busy ? "Working…" : "Create report snapshot"}</button>
      </>}
    </section>

    <section className="panel panel--flush">
      <div className="workspace-heading"><div><span className="eyebrow">Exports</span><h2>Recent report snapshots</h2><p>Every format is regenerated from the same immutable snapshot and integrity-checked before export.</p></div></div>
      {reports.length ? <div className="table-wrap"><table><caption>Recent immutable Foremention report snapshots</caption><thead><tr><th scope="col">Report</th><th scope="col">Generated</th><th scope="col">Sources</th><th scope="col">Formats</th><th scope="col">Share</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><th scope="row"><strong>{report.title}</strong><small>{LABELS[report.type]} · {report.id.slice(0, 8).toUpperCase()}</small></th><td>{date(report.generatedAt)}</td><td>{report.sourceRecordCount}</td><td><div className="reporting-export-links"><a href={`/api/reports/${report.id}/export?format=pdf`}>PDF</a><a href={`/api/reports/${report.id}/export?format=csv`}>CSV</a><a href={`/api/reports/${report.id}/export?format=json`}>JSON</a><a href={`/api/reports/${report.id}/export?format=print`} target="_blank" rel="noreferrer">Print</a><a href={`/api/reports/${report.id}/export?format=email`}>Email</a><a href={`/api/reports/${report.id}/export?format=presentation`}>Presentation</a></div></td><td><button className="button button--outline" type="button" disabled={busy} onClick={() => createShare(report.id)}>Create 7-day link</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No report snapshots yet.</h3><p>Create one from real Recommendation Records above. Foremention does not seed sample customer reports.</p></div>}
    </section>

    <section className="panel">
      <div className="workspace-heading"><div><span className="eyebrow">Scheduling</span><h2>Recurring report contract</h2><p>Weekly, monthly and quarterly schedules persist cadence, recipients and delivery audit state. Manual reports continue to use the snapshot builder above.</p></div></div>
      <form action={createSchedule} className="form-grid">
        <label><span>Schedule name</span><input name="name" required minLength={3} maxLength={120} placeholder="Executive reporting" /></label>
        <label><span>Report type</span><select name="reportType" defaultValue="executive_digest">{REPORT_TYPES.map((type) => <option key={type} value={type}>{LABELS[type]}</option>)}</select></label>
        <label><span>Cadence</span><select name="cadence" defaultValue="weekly"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
        <label><span>Timezone</span><input name="timezone" defaultValue="UTC" maxLength={80} /></label>
        <div><button className="button button--outline" type="submit" disabled={busy || migrationPending}>{busy ? "Working…" : "Save schedule"}</button></div>
      </form>
      <p className="table-caption">The current record selection ({selectedCount}) is stored as the schedule source selector. Recipient addresses are managed through the schedule recipient API; outbound delivery remains fail-closed until a real provider is configured.</p>
      {schedules.length > 0 && <div className="table-wrap"><table><caption>Configured report schedules</caption><thead><tr><th scope="col">Schedule</th><th scope="col">Cadence</th><th scope="col">Timezone</th><th scope="col">Next run</th><th scope="col">State</th></tr></thead><tbody>{schedules.map((schedule) => <tr key={schedule.id}><th scope="row">{schedule.name}<small>{LABELS[schedule.report_type]}</small></th><td>{schedule.cadence}</td><td>{schedule.timezone}</td><td>{date(schedule.next_run_at)}</td><td>{schedule.enabled ? "Enabled" : "Paused"}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
