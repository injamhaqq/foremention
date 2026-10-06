import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { loadRecordIntegrity, type RecordIntegrityAnswer } from "@/lib/record-integrity";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

export default async function PrintableRecommendationRecord({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;

  if (viewer.mode === "demo") {
    const run = (await loadRuns(viewer)).find((item) => item.id === id);
    if (!run) notFound();
    const answers = await loadRunAnswers(viewer, id);
    return <main className="print-record">
      <header><Wordmark /><div><span>Board-ready Recommendation Record</span><strong>{run.id.slice(0, 8).toUpperCase()}</strong></div></header>
      <section className="print-record__hero"><span className="eyebrow">Recommendation Intelligence</span><h1>Recommendation Record</h1><p>{run.date} · {run.answers} recorded answer{run.answers === 1 ? "" : "s"} · {run.citations} returned citation observation{run.citations === 1 ? "" : "s"}</p><p>This fictional demo does not establish a safe customer conclusion.</p></section>
      <section className="print-record__states"><div><span>Returned</span><strong>{run.citations}</strong></div><div><span>Retrieved</span><strong>Demo only</strong></div><div><span>Observed</span><strong>{run.answers}</strong></div><div><span>Reviewed</span><strong>0</strong></div><div><span>Safe conclusion</span><strong>Withheld</strong></div></section>
      <section className="print-record__answers">{answers.map((answer, index) => <article key={answer.id}><span className="eyebrow">Question {index + 1} · {answer.provider}</span><h2>{answer.prompt}</h2><p>{answer.answer}</p></article>)}</section>
      <footer className="print-record__footer">Fictional demonstration only. Returned references are provider observations, not causal proof.</footer>
    </main>;
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) notFound();
  const record = await loadRecordIntegrity({
    organizationId: context.organizationId,
    projectId: context.projectId,
    runId: id,
    token: viewer.accessToken,
  });
  if (!record) notFound();

  const run = record.run;
  const answers: RecordIntegrityAnswer[] = record.completeObservationCoverage ? record.answers : [];

  return <main className="print-record">
    <header><Wordmark /><div><span>Board-ready Recommendation Record</span><strong>{run.id.slice(0, 8).toUpperCase()}</strong></div></header>
    <section className="print-record__hero">
      <span className="eyebrow">Recommendation Intelligence</span>
      <h1>Recommendation Record</h1>
      <p>{dateLabel(run.created_at)} · {run.answer_count} recorded answer{run.answer_count === 1 ? "" : "s"} · {run.citation_count} returned citation observation{run.citation_count === 1 ? "" : "s"}</p>
      <p>Use your browser’s Print command to save this page as PDF. Foremention does not claim a server-generated PDF when no PDF renderer is configured.</p>
    </section>
    <section className="print-record__states">
      <div><span>Returned</span><strong>{run.citation_count}</strong></div>
      <div><span>Planned slots</span><strong>{record.expectedSlots}</strong></div>
      <div><span>Observed</span><strong>{run.answer_count}</strong></div>
      <div><span>Reviewed</span><strong>{record.verifiedAnswers}</strong></div>
      <div><span>Safe conclusion</span><strong>{record.safeConclusion ? "Available" : "Withheld"}</strong></div>
    </section>
    {!record.completeObservationCoverage
      ? <section className="print-record__answers"><article><span className="eyebrow">Record integrity</span><h2>Answer details withheld.</h2><p>{record.reason || "The complete persisted Recommendation Record could not be independently proven."}</p><footer><span>Failed slots: {record.failedSlots}</span><span>Missing slots: {record.missingSlots}</span></footer></article></section>
      : <section className="print-record__answers">{answers.map((answer, index) => <article key={answer.id}>
        <span className="eyebrow">Question {index + 1} · {answer.provider}{answer.model ? ` · ${answer.model}` : ""}</span>
        <h2>{answer.prompt_text || answer.prompt_key}</h2>
        <p>{answer.answer_text}</p>
        <footer><span>Review: {answer.review_status}</span><span>Returned references: {answer.citations_json?.length || 0}</span><span>Collected: {dateLabel(answer.collected_at)}</span></footer>
        {Array.isArray(answer.citations_json) && answer.citations_json.length > 0 && <ol>{answer.citations_json.map((citation, citationIndex) => <li key={`${citation.url || "reference"}-${citationIndex}`}>{citation.title || citation.url || `Returned reference ${citationIndex + 1}`}{citation.url && <small>{citation.url}</small>}</li>)}</ol>}
      </article>)}</section>}
    {!record.safeConclusion && record.completeObservationCoverage && <section className="print-record__answers"><article><span className="eyebrow">Interpretation boundary</span><h2>Safe conclusion withheld.</h2><p>{record.reason || "The complete Record is inspectable, but its review or failure state does not support a safe conclusion."}</p><footer><span>Failed slots: {record.failedSlots}</span><span>Excluded answers: {record.excludedAnswers}</span></footer></article></section>}
    <footer className="print-record__footer">Returned references are provider observations. Chronology and correlation are not proof of causation.</footer>
  </main>;
}
