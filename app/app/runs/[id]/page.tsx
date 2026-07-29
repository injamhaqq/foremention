import Link from "next/link";
import { notFound } from "next/navigation";
import { RunReview } from "@/components/run-review";
import { RunCancel } from "@/components/run-cancel";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRuns } from "@/lib/data";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const [runs, answers] = await Promise.all([loadRuns(viewer), loadRunAnswers(viewer, id)]);
  const run = runs.find((item) => item.id === id);
  if (!run) notFound();
  const emptyState = run.status === "failed"
    ? { title: "The provider did not return evidence.", body: run.errorSummary || "This run failed without creating answers or citations. Check the connected provider and try again when it is available." }
    : run.status === "cancelled"
      ? { title: "This collection was cancelled.", body: "No answers or citations were added to the evidence trail." }
      : ["complete", "partial", "review"].includes(run.status)
        ? { title: "No usable answers were returned.", body: "The run finished without evidence that can be reviewed or published." }
        : { title: "Answers have not arrived yet.", body: "The run is queued, running, or waiting for a provider retry." };
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Run {run.id.slice(0, 8).toUpperCase()}</span><h1>{run.status === "review" ? "Review collected evidence." : "Collected evidence"}</h1><p>{run.date} · {run.answers} answers · {run.citations} citation observations. Metrics remain tied to this exact run.</p></div><Link className="button button--outline" href="/app/runs">← All runs</Link></div>
    {run.status === "review" && <RunReview runId={run.id} />}
    {(run.status === "queued" || run.status === "running") && <RunCancel runId={run.id} />}
    <div className="answer-stack">{answers.length ? answers.map((answer) => <article className="panel" key={answer.id}><header><div><span>{answer.provider}</span><strong>{answer.model || "Recorded model"}</strong></div><span className={`status-chip ${answer.status === "verified" ? "status-chip--active" : ""}`}>{answer.status}</span></header><h2>{answer.prompt}</h2><p>{answer.answer}</p><div className="answer-citations"><strong>Cited URLs</strong>{answer.citations.length ? answer.citations.map((citation) => <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>{citation.title || citation.url} ↗</a>) : <span>No cited URLs returned</span>}</div><small>Collected {answer.collectedAt}</small></article>) : <section className="panel empty-state"><h2>{emptyState.title}</h2><p>{emptyState.body}</p></section>}</div>
  </main>;
}
