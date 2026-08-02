import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { RunLauncher } from "@/components/run-launcher";
import { CompletedCollectionEvents } from "@/components/product-event";
import { requireViewer } from "@/lib/auth";
import { loadPrompts, loadProviderStatuses, loadRuns } from "@/lib/data";

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { page: requestedPage } = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(requestedPage || "1", 10) || 1));
  const pageSize = 20;
  const [runPage, prompts, providers] = await Promise.all([loadRuns(viewer, { limit: pageSize + 1, offset: (page - 1) * pageSize }), loadPrompts(viewer), loadProviderStatuses(viewer)]);
  const hasNext = runPage.length > pageSize;
  const runs = runPage.slice(0, pageSize);
  return <main className="workspace">
    {viewer.mode !== "demo" && <CompletedCollectionEvents runs={runs.map((run) => ({ id: run.id, status: run.status }))} />}
    <div className="workspace-heading"><div><span className="eyebrow">Evidence trail</span><h1>Answer runs</h1><p>Collect the same approved buyer questions across connected providers. Every result retains its model, time, answer, citations, failures, and review state.</p></div><Link className="button button--outline" href="/app/prompts">Manage questions</Link></div>
    <RunLauncher prompts={prompts} providers={providers} demo={viewer.mode === "demo"} />
    <section className="panel panel--flush run-history">{runs.length ? <div className="run-table"><div className="run-row run-row--head"><span>Run</span><span>Status</span><span>Prompts</span><span>Answers</span><span>Citations</span><span>Presence</span><span>First mention</span><span>Sources</span></div>{runs.map((run) => <Link className="run-row" href={`/app/runs/${run.id}`} key={run.id}><div><strong>{run.id.slice(0, 8).toUpperCase()}</strong><small>{run.date}</small></div><div className="presence-cell"><StatusDot tone={run.status === "complete" ? "green" : run.status === "running" ? "yellow" : run.status === "review" ? "yellow" : "gray"} />{run.status}</div><strong>{run.prompts}</strong><strong>{run.answers}</strong><strong>{run.citations}</strong><strong>{run.presence}%</strong><strong>{run.firstMention}%</strong><strong>{run.newSources}</strong></Link>)}</div> : <div className="empty-state"><h2>No collection runs yet.</h2><p>Answer Runs preserve the provider, model, answer, citations, cost, and review state for each dated collection. Select active questions and a connected provider above to create the first baseline.</p><Link className="text-link" href="/app/prompts">Review buyer questions →</Link></div>}</section>
    {(page > 1 || hasNext) && <nav className="workspace-pagination" aria-label="Answer run pages"><Link aria-disabled={page === 1} href={page === 1 ? "#" : `/app/runs?page=${page - 1}`}>Previous</Link><span>Page {page}</span><Link aria-disabled={!hasNext} href={hasNext ? `/app/runs?page=${page + 1}` : "#"}>Next</Link></nav>}
    <div className="evidence-note"><strong>Run rule</strong><p>A partial provider failure never becomes a complete run automatically. Results wait for human review, and unreviewed evidence stays out of analytics.</p></div>
  </main>;
}
