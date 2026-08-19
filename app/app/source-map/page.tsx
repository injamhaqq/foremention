import Link from "next/link";
import { LazySourceMapTable } from "@/components/lazy-workspace-panels";
import { SourceClusters } from "@/components/source-clusters";
import { ProductEventOnView } from "@/components/product-event";
import { demoCompany } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadRuns } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { productStateLabel, stateForSources } from "@/lib/product-state";
import { clusterSources } from "@/lib/source-clustering";

export default async function SourceMapPage() {
  const viewer = await requireViewer("/app/source-map");
  const [entries, role, latestRuns] = await Promise.all([loadTruthfulSourceMap(viewer), getPrimaryWorkspaceRole(viewer), loadRuns(viewer, { limit: 1 })]);
  const canEdit = viewer.mode === "demo" || role === "owner" || role === "admin" || role === "analyst";
  const category = viewer.mode === "demo" ? demoCompany.category : "your active category";
  const reviewedGaps = entries.filter((entry) => Boolean(entry.reviewedAt) && !entry.clientPresent).length;
  const unreviewed = entries.filter((entry) => !entry.reviewedAt).length;
  const humanReviewed = entries.length - unreviewed;
  const automatedChecks = entries.filter((entry) => entry.crawlerAccess !== "unknown").length;
  const observations = entries.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...entries].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const providerCoverage = new Set(entries.flatMap((entry) => entry.engines)).size;
  const reviewCompletion = entries.length ? Math.round((humanReviewed / entries.length) * 100) : 0;
  const clusters = clusterSources(entries);
  const latest = latestRuns[0] || null;
  const state = stateForSources(latest ? { status: latest.status, answerCount: latest.answers, citationCount: latest.citations } : null, entries.length, unreviewed);

  const empty = !latest
    ? { title: "No collection has been run yet.", body: "Start a collection first. Sources appear only when an AI system actually returns web citations.", cta: "Start a collection", href: "/app/runs" }
    : state === "COLLECTING"
      ? { title: "Sources are not ready yet.", body: "Foremention is still collecting the latest AI answers. Any returned citations will appear here after they are saved.", cta: "View collection progress", href: `/app/runs/${latest.id}` }
      : state === "FAILED_RECOVERABLE"
        ? { title: "The latest collection did not produce source evidence.", body: latest.errorSummary || "The collection failed before usable cited-source evidence was saved. Existing source history remains unchanged.", cta: "Inspect the failed collection", href: `/app/runs/${latest.id}` }
        : latest.citations === 0
          ? { title: "The latest AI answers returned no cited URLs.", body: "The answers are still preserved. Foremention will not invent a Source Map when the AI system returns no web citations.", cta: "Inspect the AI answers", href: `/app/runs/${latest.id}` }
          : { title: "No published source map is available yet.", body: "Citations were recorded, but a source view is not available yet. Inspect the collection instead of treating this as zero source activity.", cta: "Review the collection", href: `/app/runs/${latest.id}` };

  return <main className="workspace" data-product-state={state}>
    {viewer.mode !== "demo" && <ProductEventOnView event="source_map_opened" />}
    <div className="workspace-heading"><div><span className="eyebrow">Evidence</span><h1>Sources</h1><p>See the pages AI systems actually cited in answers about {category}. Citation capture is automatic; page-level brand presence stays unreviewed until checked by a person. Automated retrieval can record reachability and a page snapshot, but brand presence, competitors, routes, influence, and feasibility count as reviewed only after a person explicitly saves that review.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong>{latest ? ` · Latest collection ${latest.date}` : " · No collection recorded"}</p></div><Link className="button button--ink" data-workspace-export href="/api/export/source-map">Export sources &darr;</Link></div>
    <section className="panel panel--flush">
      <div className="map-summary"><div><strong>{entries.length}</strong><span>sources</span></div><div><strong>{observations}</strong><span>AI citations</span></div><div><strong>{humanReviewed}</strong><span>human reviewed</span></div><div><strong>{reviewedGaps}</strong><span>verified gaps</span></div></div>
      {entries.length ? <>
        {unreviewed > 0 && <div className="review-queue-callout"><div><span className="eyebrow">Human review queue</span><h2>{unreviewed} cited page{unreviewed === 1 ? "" : "s"} still need a decision.</h2><p>Foremention confirmed that an AI provider returned these URLs. Automated page checks do not close this queue. A person still needs to confirm brand presence, competitors, and whether any legitimate opportunity exists.</p></div><Link className="button button--ink" href={`/app/sources/${entries.find((entry) => !entry.reviewedAt)?.id}`}>Review next source &rarr;</Link></div>}
        <div className="data-quality-grid"><div><span>Review completion</span><strong>{humanReviewed} of {entries.length}</strong><small>{reviewCompletion}% of cited pages explicitly human-reviewed</small></div><div><span>Automated page checks</span><strong>{automatedChecks} of {entries.length}</strong><small>retrieval state only; not human review</small></div><div><span>AI systems represented</span><strong>{providerCoverage}</strong><small>providers represented in these citations</small></div><div><span>Evidence concentration</span><strong>{observations ? Math.round((topThreeObservations / observations) * 100) : 0}%</strong><small>{topThreeObservations} of {observations} citation observations come from the top three sources</small></div></div>
        <SourceClusters clusters={clusters} />
        <LazySourceMapTable entries={entries} canEdit={canEdit} demo={viewer.mode === "demo"} />
      </> : <div className="empty-state"><h2>{empty.title}</h2><p>{empty.body}</p><Link className="button button--ink" href={empty.href}>{empty.cta} &rarr;</Link></div>}
    </section>
  </main>;
}
