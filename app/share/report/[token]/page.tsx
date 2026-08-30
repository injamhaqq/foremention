import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { buildExecutiveVisualizations } from "@/lib/reporting";
import { resolveReportShare } from "@/lib/report-sharing";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Shared Foremention Report",
  robots: { index: false, follow: false, nocache: true },
};

const date = (value: string) => Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
  : "Not recorded";

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolveReportShare(token).catch(() => null);
  if (!share) notFound();
  const report = share.public_payload;
  const visuals = buildExecutiveVisualizations(report);

  return <main className="shared-record-shell" data-report-id={report.id}>
    <header className="shared-record-header"><Wordmark /><span>Secure read-only stakeholder report</span></header>
    <section className="shared-record-hero">
      <div><span className="eyebrow">{report.type.replaceAll("_", " ")}</span><h1>{report.title}</h1><p>{report.executiveSummary}</p></div>
      <dl><div><dt>Generated</dt><dd>{date(report.generatedAt)}</dd></div><div><dt>Data as of</dt><dd>{date(report.dataAsOf)}</dd></div><div><dt>Source records</dt><dd>{report.sourceRecordIds.length}</dd></div><div><dt>Share expires</dt><dd>{date(share.expires_at)}</dd></div></dl>
    </section>
    <aside className="panel" aria-label="Interpretation boundary"><strong>Interpretation boundary</strong><p>{report.causalityBoundary}</p></aside>
    <section className="panel">
      <span className="eyebrow">Measurement context</span><h2>What this report actually measured</h2>
      <dl>{report.truth.measurementEnvironments.map((environment, index) => <div key={`${environment.source}-${index}`}><dt>Environment {index + 1}</dt><dd>{environment.source} · {environment.schedule} · {environment.methodology} · {environment.locale} · {environment.market}</dd></div>)}</dl>
      <p>Raw provider transcripts are not included in this shared report. Exact buyer-question text, provider/model context, evidence state, uncertainty, comparison eligibility and review state remain visible where the report snapshot recorded them.</p>
    </section>
    <section className="panel panel--flush">
      <div className="table-wrap"><table><caption>Buyer questions preserved in the report snapshot</caption><thead><tr><th scope="col">Question</th></tr></thead><tbody>{report.truth.questions.map((question) => <tr key={`${question.id}-${question.text}`}><th scope="row">{question.text}</th></tr>)}</tbody></table></div>
    </section>
    {visuals.map((visual) => <section className="panel panel--flush" key={visual.kind} aria-labelledby={`report-visual-${visual.kind}`}>
      <div className="workspace-heading"><div><h2 id={`report-visual-${visual.kind}`}>{visual.title}</h2><p>{visual.description}</p></div></div>
      <div className="table-wrap"><table><caption>{visual.title} — accessible data table</caption><thead><tr>{visual.table.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{visual.table.rows.length ? visual.table.rows.map((row, rowIndex) => <tr key={`${visual.kind}-${rowIndex}`}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th scope="row" key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={visual.table.columns.length}>No validated data is available for this view.</td></tr>}</tbody></table></div>
    </section>)}
    <footer className="shared-record-footer"><p>Audit reference: {report.id}</p><p>Recommendation Record references: {report.sourceRecordIds.join(", ")}</p><p>This link is revocable, expiring, non-indexable, and resolves only the public-safe frozen snapshot.</p></footer>
  </main>;
}
