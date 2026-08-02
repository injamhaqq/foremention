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
    <div className="workspace-heading"><div><span className="eyebrow">Evidence graph</span><h1>Source Map</h1><p>The dated pages cited in answers about {category}. Citation observation is automatic; page-level brand presence stays unreviewed until checked.</p></div><Link className="button button--ink" data-workspace-export href="/api/export/source-map">Export evidence &darr;</Link></div>
    <section className="panel panel--flush">
      <div className="map-summary"><div><strong>{entries.length}</strong><span>mapped URLs</span></div><div><strong>{observations}</strong><span>citation observations</span></div><div><strong>{reviewedGaps}</strong><span>confirmed source gaps</span></div><div><strong>{unreviewed}</strong><span>pages awaiting review</span></div></div>
      {entries.length ? <>
        {unreviewed > 0 && <div className="review-queue-callout"><div><span className="eyebrow">Human review queue</span><h2>{unreviewed} cited page{unreviewed === 1 ? "" : "s"} still need a decision.</h2><p>Collection proved that the provider returned these URLs. It did not prove page reachability, your brand&apos;s presence, competitors, editorial fit, or a legitimate route. Review those facts before Foremention calls anything a priority gap.</p></div><Link className="button button--ink" href={`/app/sources/${entries.find((entry) => entry.crawlerAccess === "unknown")?.id}`}>Review next source &rarr;</Link></div>}
        <div className="data-quality-grid"><div><span>Review completion</span><strong>{reviewCompletion}%</strong><small>{entries.length - unreviewed} of {entries.length} pages checked</small></div><div><span>Provider coverage</span><strong>{providerCoverage}</strong><small>providers represented in this map</small></div><div><span>Evidence concentration</span><strong>{observations ? Math.round((topThreeObservations / observations) * 100) : 0}%</strong><small>of observations come from the top three sources</small></div><div><span>Recurring evidence</span><strong>{entries.filter((entry) => entry.evidenceCount > 1).length}</strong><small>sources observed more than once</small></div></div>
        <SourceClusters clusters={clusters} />
        <LazySourceMapTable entries={entries} canEdit={canEdit} demo={viewer.mode === "demo"} />
      </> : <div className="empty-state"><h2>No Source Map yet.</h2><p>Complete onboarding, connect a provider, select buyer questions, and approve the first collection run.</p><Link className="button button--ink" href="/app/runs">Start collection &rarr;</Link></div>}
    </section>
  </main>;
}
