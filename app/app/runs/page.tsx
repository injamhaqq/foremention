import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadRuns } from "@/lib/data";

export default async function RunsPage() {
  const viewer = await requireViewer("/app/runs");
  const runs = await loadRuns(viewer);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Evidence trail</span><h1>Run history</h1><p>Each run retains its prompt set, providers, answer count, citations, and review state.</p></div><Link className="button button--ink" href="/app/prompts">Approve prompts →</Link></div>
    <section className="panel panel--flush">{runs.length ? <div className="run-table"><div className="run-row run-row--head"><span>Run</span><span>Status</span><span>Prompts</span><span>Answers</span><span>Citations</span><span>Presence</span><span>First mention</span><span>New sources</span></div>{runs.map(run => <div className="run-row" key={run.id}><div><strong>{run.id}</strong><small>{run.date}</small></div><div className="presence-cell"><StatusDot tone={run.status === "complete" ? "green" : run.status === "running" ? "yellow" : "gray"} />{run.status}</div><strong>{run.prompts}</strong><strong>{run.answers}</strong><strong>{run.citations}</strong><strong>{run.presence}%</strong><strong>{run.firstMention}%</strong><strong>+{run.newSources}</strong></div>)}</div> : <div className="empty-state"><h2>No collection runs yet.</h2><p>Queue a run after adding a category and prompt set.</p></div>}</section>
    <div className="evidence-note"><strong>Run rule</strong><p>A partial provider failure does not become a complete run. It stays in review until the gap is visible in the record.</p></div>
  </main>;
}
