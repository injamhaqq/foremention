import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadAuthenticatedRecommendationRecord } from "@/lib/recommendation-record-reader";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

export default async function PrintableRecommendationRecord({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const record = await loadAuthenticatedRecommendationRecord(viewer, id);
  if (!record) notFound();

  const { run, answers, evidenceState } = record;
  const date = dateLabel(run.createdAt);

  return <main className="print-record">
    <header><Wordmark /><div><span>Board-ready Recommendation Record</span><strong>{run.id.slice(0, 8).toUpperCase()}</strong></div></header>
    <section className="print-record__hero">
      <span className="eyebrow">Recommendation Intelligence</span>
      <h1>Recommendation Record</h1>
      <p>{date} · {run.answerCount} recorded answer{run.answerCount === 1 ? "" : "s"} · {run.citationCount} returned citation observation{run.citationCount === 1 ? "" : "s"}</p>
      <p>Use your browser’s Print command to save this page as PDF. Foremention does not claim a server-generated PDF when no PDF renderer is configured.</p>
    </section>
    <section className="print-record__states">
      <div><span>Returned</span><strong>{run.citationCount}</strong></div>
      <div><span>Retrieved</span><strong>Inspect per source</strong></div>
      <div><span>Observed</span><strong>{run.answerCount}</strong></div>
      <div><span>Reviewed</span><strong>{evidenceState.fullyLoaded ? `${evidenceState.reviewedCount} of ${run.answerCount}` : "Completeness unavailable"}</strong></div>
      <div><span>Answer review</span><strong>{evidenceState.reviewComplete ? "Complete" : "Not established"}</strong></div>
    </section>
    {!evidenceState.fullyLoaded
      ? <section className="print-record__answers" role="status"><article><h2>Full Record unavailable</h2><p>The complete persisted answer set could not be independently verified within the bounded Record view. Answer detail is withheld rather than printing a partial subset as a complete Recommendation Record.</p></article></section>
      : <section className="print-record__answers">{answers.map((answer, index) => <article key={answer.id}>
        <span className="eyebrow">Question {index + 1} · {answer.provider}{answer.model ? ` · ${answer.model}` : ""}</span>
        <h2>{answer.prompt}</h2>
        <p>{answer.answer}</p>
        <footer><span>Review: {answer.reviewStatus}</span><span>Returned references: {answer.citations.length}</span><span>Collected: {dateLabel(answer.collectedAt)}</span></footer>
        {answer.citations.length > 0 && <ol>{answer.citations.map((citation, citationIndex) => <li key={`${citation.url || "reference"}-${citationIndex}`}>{citation.title || citation.url || `Returned reference ${citationIndex + 1}`}{citation.url && <small>{citation.url}</small>}</li>)}</ol>}
      </article>)}</section>}
    <footer className="print-record__footer">Review completeness means the full persisted answer set was read and marked reviewed. It does not independently prove citation relevance, source truth, recommendation causation, or customer impact.</footer>
  </main>;
}
