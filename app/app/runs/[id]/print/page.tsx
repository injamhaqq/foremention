import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRuns } from "@/lib/data";

export default async function PrintableRecommendationRecord({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const run = (await loadRuns(viewer)).find((item) => item.id === id);
  if (!run) notFound();
  const answers = await loadRunAnswers(viewer, id);
  const reviewed = answers.filter((answer) => answer.status === "verified").length;
  const safeConclusion = ["complete", "partial"].includes(run.status) && reviewed > 0;
  return <main className="print-record">
    <header><Wordmark /><div><span>Board-ready Recommendation Record</span><strong>{run.id.slice(0, 8).toUpperCase()}</strong></div></header>
    <section className="print-record__hero"><span className="eyebrow">Recommendation Intelligence</span><h1>Recommendation Record</h1><p>{run.date} · {run.answers} recorded answer{run.answers === 1 ? "" : "s"} · {run.citations} returned citation observation{run.citations === 1 ? "" : "s"}</p><p>Use your browser’s Print command to save this page as PDF. Foremention does not claim a server-generated PDF when no PDF renderer is configured.</p></section>
    <section className="print-record__states"><div><span>Returned</span><strong>{run.citations}</strong></div><div><span>Retrieved</span><strong>Inspect per source</strong></div><div><span>Observed</span><strong>{run.answers}</strong></div><div><span>Reviewed</span><strong>{reviewed}</strong></div><div><span>Safe conclusion</span><strong>{safeConclusion ? "Available" : "Withheld"}</strong></div></section>
    <section className="print-record__answers">{answers.map((answer, index) => <article key={answer.id}><span className="eyebrow">Question {index + 1} · {answer.provider}{answer.model ? ` · ${answer.model}` : ""}</span><h2>{answer.prompt}</h2><p>{answer.answer}</p><footer><span>Review: {answer.status}</span><span>Returned references: {answer.citations.length}</span><span>Collected: {answer.collectedAt}</span></footer>{answer.citations.length > 0 && <ol>{answer.citations.map((citation) => <li key={citation.url}>{citation.title || citation.url}<small>{citation.url}</small></li>)}</ol>}</article>)}</section>
    <footer className="print-record__footer">Returned references are provider observations. Chronology and correlation are not proof of causation.</footer>
  </main>;
}
