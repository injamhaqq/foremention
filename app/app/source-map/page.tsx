import Link from "next/link";
import { LazySourceMapTable } from "@/components/lazy-workspace-panels";
import { SourceClusters } from "@/components/source-clusters";
import { ProductEventOnView } from "@/components/product-event";
import { demoCompany } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadSourceMap } from "@/lib/data";
import { clusterSources } from "@/lib/source-clustering";

export default async function SourceMapPage() {
  const viewer = await requireViewer("/app/source-map");
  const [entries, role] = await Promise.all([loadSourceMap(viewer), getPrimaryWorkspaceRole(viewer)]);
  const canEdit = viewer.mode === "demo" || role === "owner" || role === "admin" || role === "analyst";
  const category = viewer.mode === "demo" ? demoCompany.category : "your active category";
  const reviewedGaps = entries.filter((entry) => entry.crawlerAccess !== "unknown" && !entry.clientPresent).length;
  const unreviewed = entries.filter((entry) => entry.crawlerAccess === "unknown").length;
  const observations = entries.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...entries].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const providerCoverage = new Set(entries.flatMap((entry) => entry.engines)).size;
  const reviewCompletion = entries.length ? Math.round(((entries.length - unreviewed) / entries.length) * 100) : 0;
  const clusters = clusterSources(entries);
  return <main className="workspace">
    {viewer.mode !== "demo" && <ProductEventOnView event="source_map_opened" />}
    <div className="workspace-heading"><div><span className="eyebrow">Evidence</span><h1>Sources</h1><p>See the pages AI systems actually cited in answers about {category}. Citation capture is automatic; page-level brand presence stays unreviewed until checked by a person.</p></div><Link className="button button--ink" data-workspace-export href="/api/export/source-map">Export sources &darr;</Link></div>
    <section className="panel panel--flush">
      <div className="map-summary"><div><strong>{entries.length}</strong><span>sources</span></div><div><strong>{observations}</strong><span>AI citations</span></div><div><strong>{reviewedGaps}</strong><span>verified gaps</span></div><div><strong>{unreviewed}</strong><span>need review</span></div></div>
      {entries.length ? <>
        {unreviewed > 0 && <div className="review-queue-callout"><div><span className="eyebrow">Human review queue</span><h2>{unreviewed} cited page{unreviewed === 1 ? "" : "s"} still need a decision.</h2><p>Foremention confirmed that an AI provider returned these URLs. A person still needs to check page reachability, your brand, competitors, and whether any legitimate opportunity exists.</p></div><Link className="button button--ink" href={`/app/sources/${entries.find((entry) => entry.crawlerAccess === "unknown")?.id}`}>Review next source &rarr;</Link></div>}
        <div className="data-quality-grid"><div><span>Review completion</span><strong>{reviewCompletion}%</strong><small>{entries.length - unreviewed} of {entries.length} pages checked</small></div><div><span>AI systems represented</span><strong>{providerCoverage}</strong><small>providers represented in these citations</small></div><div><span>Evidence concentration</span><strong>{observations ? Math.round((topThreeObservations / observations) * 100) : 0}%</strong><small>of citations come from the top three sources</small></div><div><span>Recurring sources</span><strong>{entries.filter((entry) => entry.evidenceCount > 1).length}</strong><small>sources observed more than once</small></div></div>
        <SourceClusters clusters={clusters} />
        <LazySourceMapTable entries={entries} canEdit={canEdit} demo={viewer.mode === "demo"} />
      </> : <div className="empty-state"><h2>No cited sources yet.</h2><p>Sources appear only when a completed AI answer returns real web citations. Start a collection; if an AI system returns no citations, Foremention will keep the answer without inventing source data.</p><Link className="button button--ink" href="/app/runs">Start a collection &rarr;</Link></div>}
    </section>
  </main>;
}
