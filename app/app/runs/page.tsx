import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { RunLauncher } from "@/components/run-launcher";
import { RunComparisonSelector } from "@/components/run-comparison-selector";
import { CompletedCollectionEvents } from "@/components/product-event";
import { requireViewer } from "@/lib/auth";
import { loadPrompts, loadProviderStatuses, loadRuns } from "@/lib/data";
import { productStateLabel, stateForRun } from "@/lib/product-state";

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { page: requestedPage } = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(requestedPage || "1", 10) || 1));
  const pageSize = 20;
  const [runPage, prompts, providers, comparisonRuns] = await Promise.all([loadRuns(viewer, { limit: pageSize + 1, offset: (page - 1) * pageSize }), loadPrompts(viewer), loadProviderStatuses(viewer), loadRuns(viewer, { limit: 100 })]);
  const hasNext = runPage.length > pageSize;
  const runs = runPage.slice(0, pageSize);
  const latest = comparisonRuns[0] || runs[0] || null;
  const state = stateForRun(latest ? { status: latest.status, answerCount: latest.answers, citationCount: latest.citations } : null);
  return <main className="workspace" data-product-state={state}>
    {viewer.mode !== "demo" && <CompletedCollectionEvents runs={runs.map((run) => ({ id: run.id, status: run.status }))} />}
    <div className="workspace-heading"><div><span className="eyebrow">AI evidence</span><h1>AI Results</h1><p>Ask approved buyer questions, see what an AI system actually answered, and inspect the returned sources. Foremention preserves the exact provider, model, time, failures, and review state underneath every result.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong>{latest ? ` · Last collected ${latest.date}` : " · No collection has been recorded yet"}</p></div><Link className="button button--outline" href="/app/prompts">Manage questions</Link></div>
    <RunLauncher prompts={prompts} providers={providers} demo={viewer.mode === "demo"} />
    <RunComparisonSelector runs={comparisonRuns} />
    <section className="panel panel--flush run-history">{runs.length ? <div className="run-table"><div className="run-row run-row--head"><span>Collection</span><span>Status</span><span>Questions</span><span>Answers</span><span>Citations</span><span>Brand presence</span><span>First mention</span><span>Sources</span></div>{runs.map((run) => <Link className="run-row" href={`/app/runs/${run.id}`} key={run.id}><div><strong>{run.id.slice(0, 8).toUpperCase()}</strong><small>{run.date}</small></div><div className="presence-cell"><StatusDot tone={run.status === "complete" ? "green" : run.status === "running" ? "yellow" : run.status === "review" ? "yellow" : "gray"} />{productStateLabel(stateForRun({ status: run.status, answerCount: run.answers, citationCount: run.citations }))}</div><strong>{run.prompts}</strong><strong>{run.answers}</strong><strong>{run.citations}</strong><strong>{run.answers ? `${run.presence}% of ${run.answers}` : "—"}</strong><strong>{run.answers ? `${run.firstMention}% of ${run.answers}` : "—"}</strong><strong>{run.newSources}</strong></Link>)}</div> : <div className="empty-state"><h2>No AI results yet.</h2><p>Select an approved question and start the first collection. Foremention will preserve the real answer, any returned citations, and failures without filling gaps with demo data.</p><Link className="text-link" href="/app/prompts">Review buyer questions &rarr;</Link></div>}</section>
    {(page > 1 || hasNext) && <nav className="workspace-pagination" aria-label="AI result pages"><Link aria-disabled={page === 1} href={page === 1 ? "#" : `/app/runs?page=${page - 1}`}>Previous</Link><span>Page {page}</span><Link aria-disabled={!hasNext} href={hasNext ? `/app/runs?page=${page + 1}` : "#"}>Next</Link></nav>}
    <div className="evidence-note"><strong>Evidence rule</strong><p>A partial provider failure never becomes a complete result automatically. Results wait for human review, and unreviewed evidence stays out of customer-facing analytics.</p></div>
  </main>;
}
