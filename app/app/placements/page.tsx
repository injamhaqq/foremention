import Link from "next/link";
import { PlacementBoard } from "@/components/placement-board";
import { requireViewer } from "@/lib/auth";
import { loadPlacements, loadRuns, loadSourceEvidenceContexts, loadSourceMap } from "@/lib/data";
import { productStateLabel, stateForSources } from "@/lib/product-state";

export default async function PlacementsPage() {
  const viewer = await requireViewer("/app/placements");
  const [placements, sources, latestRuns] = await Promise.all([loadPlacements(viewer), loadSourceMap(viewer), loadRuns(viewer, { limit: 1 })]);
  const reviewedCandidates = sources.filter((source) => !source.clientPresent && source.crawlerAccess !== "unknown" && source.route !== "unknown" && source.influence !== "unknown" && source.feasibility !== "unknown");
  const candidates = reviewedCandidates.slice(0, 3);
  const contexts = await loadSourceEvidenceContexts(viewer, candidates.flatMap((source) => source.sourceId ? [source.sourceId] : []));
  const latest = latestRuns[0] || null;
  const sourceState = stateForSources(latest ? { status: latest.status, answerCount: latest.answers, citationCount: latest.citations } : null, sources.length, sources.filter((source) => source.crawlerAccess === "unknown").length);
  const actionState = placements.length ? "COMPLETE" : reviewedCandidates.length ? "READY_TO_COLLECT" : sourceState;

  return <main className="workspace" data-product-state={actionState}>
    <div className="workspace-heading"><div><span className="eyebrow">What are we doing next?</span><h1>Actions</h1><p>Turn a reviewed opportunity into owned work. Every action keeps the source, legitimate route, owner, status, dated notes, and later remeasurement linked to the evidence that justified it.</p><p className="table-caption"><strong>{placements.length ? `${placements.length} tracked action${placements.length === 1 ? "" : "s"}` : reviewedCandidates.length ? `${reviewedCandidates.length} reviewed opportunit${reviewedCandidates.length === 1 ? "y" : "ies"} ready for action` : productStateLabel(sourceState)}</strong>{latest ? ` · Evidence last collected ${latest.date}` : ""}</p></div><Link className="button button--ink" href="/app/opportunities">Choose an opportunity →</Link></div>
    {placements.length ? <PlacementBoard placements={placements} demo={viewer.mode === "demo"} /> : <section className="panel panel--flush"><div className="empty-state"><h2>{reviewedCandidates.length ? "Choose a reviewed opportunity to create your first action." : sourceState === "NEEDS_REVIEW" ? "Review cited sources before creating an action." : sourceState === "COLLECTING" ? "Evidence is still being collected." : "No action is ready yet."}</h2><p>{reviewedCandidates.length ? "Only reviewed opportunities with a recorded route are offered here. The evidence link is preserved when you create the action." : "Foremention does not invent outreach tasks. Collect evidence, review cited pages, then act on a legitimate opportunity."}</p><Link className="text-link" href={reviewedCandidates.length ? "/app/opportunities" : sources.length ? "/app/source-map" : "/app/runs"}>{reviewedCandidates.length ? "Open Opportunities" : sources.length ? "Review Sources" : "Collect AI Results"} →</Link></div>{candidates.length > 0 && <div className="action-candidate-list">{candidates.map((source) => { const evidence = source.sourceId ? contexts[source.sourceId]?.[0] : undefined; return <Link href="/app/opportunities" key={source.id}><span><strong>{source.domain}</strong><small>{source.title}</small></span><span><small>{evidence?.prompt || `${source.evidenceCount} citation observation${source.evidenceCount === 1 ? "" : "s"}`}</small><b>{source.route} · Create action →</b></span></Link>; })}</div>}</section>}
  </main>;
}
