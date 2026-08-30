import { ReportingWorkbench, type ReportingScheduleOption, type ReportingSnapshotOption } from "@/components/reporting-workbench";
import { requireViewer } from "@/lib/auth";
import { loadRuns } from "@/lib/data";
import { listReportSnapshots } from "@/lib/report-persistence";
import { reportDeliveryConfigFromEnv, reportDeliveryReadiness } from "@/lib/report-scheduling";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";
import type { ReportCadence, ReportType } from "@/lib/reporting";

const REPORT_CATALOG: Array<{ type: ReportType; audience: string; job: string }> = [
  { type: "recommendation_record", audience: "Operator / reviewer", job: "One evidence-bearing Recommendation Record with exact question and provider/model context." },
  { type: "weekly_operator_summary", audience: "SEO / organic operator", job: "What changed, what needs review, and what action is due this week." },
  { type: "executive_digest", audience: "CMO / VP Marketing", job: "Decision-relevant movement, evidence coverage, risk and next actions without technical screen hunting." },
  { type: "monthly_review", audience: "Marketing leadership", job: "Month-level reviewed observations, competitive differences and action progress." },
  { type: "quarterly_business_review", audience: "Executive sponsor / CS", job: "Quarterly value realization, evidence quality, actions, outcomes and open risks." },
  { type: "competitor_intelligence_brief", audience: "Strategy / product marketing", job: "Observed competitor recommendation differences with comparable-context caveats." },
  { type: "action_outcome_report", audience: "Operator / executive sponsor", job: "Decision → action → remeasurement chain with observed-association limits." },
  { type: "board_ready_summary", audience: "Board / leadership", job: "Compact material facts, uncertainty, actions, outcomes and explicit non-causal boundaries." },
  { type: "agency_client_report", audience: "Agency / client", job: "Client-safe evidence, work completed, observed changes and inspectable source references." },
];

const label = (type: ReportType) => type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

type ScheduleRow = ReportingScheduleOption & { source_selector?: { runIds?: string[] } };

export default async function ReportsPage() {
  const viewer = await requireViewer("/app/reports");
  const runs = await loadRuns(viewer, { limit: 30 });
  let migrationPending = false;
  const reports = viewer.mode === "demo" ? [] : await listReportSnapshots(viewer).catch((error) => {
    if (isMissingRelationError(error)) { migrationPending = true; return []; }
    throw error;
  });
  const schedules = viewer.mode === "demo" ? [] : await supabaseRest<ScheduleRow[]>(
    "report_schedules?select=id,report_type,name,cadence,timezone,source_selector,enabled,next_run_at&order=created_at.desc&limit=100",
    { token: viewer.accessToken },
  ).catch((error) => {
    if (isMissingRelationError(error)) { migrationPending = true; return []; }
    throw error;
  });
  const delivery = reportDeliveryReadiness(reportDeliveryConfigFromEnv());
  const reportOptions: ReportingSnapshotOption[] = reports.map((row) => ({ id: row.id, type: row.report_type, title: row.title, generatedAt: row.generated_at, dataAsOf: row.data_as_of, sourceRecordCount: row.source_record_ids.length }));

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Communication layer</span><h1>Reports</h1><p>Turn reviewed Recommendation Intelligence into stakeholder-ready communication without dropping measurement context, uncertainty, review state, or traceability.</p></div></div>
    <div className="metric-grid metric-grid--compact">
      <article><span>Canonical report types</span><strong>9</strong><small>operator → executive → board/client</small></article>
      <article><span>Immutable snapshots</span><strong>{reports.length}</strong><small>no synthetic customer reports</small></article>
      <article><span>Recurring schedules</span><strong>{schedules.filter((schedule) => schedule.enabled).length}</strong><small>weekly · monthly · quarterly</small></article>
      <article><span>Email transport</span><strong>{delivery.ready ? "Configured" : "Disabled"}</strong><small>{delivery.ready ? "provider prerequisites detected" : delivery.reason.replaceAll("_", " ")}</small></article>
    </div>

    <section className="panel panel--flush">
      <div className="workspace-heading"><div><span className="eyebrow">Report system</span><h2>One truth model, nine communication jobs</h2><p>The format changes by audience; the evidence and interpretation boundary do not.</p></div></div>
      <div className="table-wrap"><table><caption>Canonical Foremention report types and intended communication job</caption><thead><tr><th scope="col">Report</th><th scope="col">Primary audience</th><th scope="col">Communication job</th></tr></thead><tbody>{REPORT_CATALOG.map((report) => <tr key={report.type}><th scope="row">{label(report.type)}</th><td>{report.audience}</td><td>{report.job}</td></tr>)}</tbody></table></div>
    </section>

    <section className="panel">
      <span className="eyebrow">Report truth</span><h2>Required on every snapshot</h2><div className="metric-grid metric-grid--compact"><article><span>Measurement</span><strong>Date + environment</strong><small>unknown fields stay unknown</small></article><article><span>Question context</span><strong>Exact text</strong><small>provider/model retained</small></article><article><span>Evidence</span><strong>Coverage + state</strong><small>unsupported evidence stays visible</small></article><article><span>Interpretation</span><strong>Eligibility + uncertainty</strong><small>customer review state preserved</small></article></div>
      <p className="table-caption">A later measurement may be associated with an action; Foremention does not upgrade chronology or correlation into a causal conclusion.</p>
    </section>

    <ReportingWorkbench runs={runs.map((run) => ({ id: run.id, date: run.date, status: run.status, answers: run.answers, citations: run.citations }))} reports={reportOptions} schedules={schedules.map((schedule) => ({ id: schedule.id, report_type: schedule.report_type, name: schedule.name, cadence: schedule.cadence as ReportCadence, timezone: schedule.timezone, enabled: schedule.enabled, next_run_at: schedule.next_run_at }))} migrationPending={migrationPending} />

    <aside className="panel"><strong>Delivery safety boundary</strong><p>Report generation, exports, secure links, schedules, recipient consent state and delivery logs are separate from external sending. A schedule never means an email was sent. Delivery must remain blocked until the deployment has a real configured provider and sender, and only provider-confirmed attempts may move into sent/delivered states.</p></aside>
  </main>;
}
