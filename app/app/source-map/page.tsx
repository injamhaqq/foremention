import Link from "next/link";
import { SourceMapTable } from "@/components/source-map-table";
import { demoCompany } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { loadSourceMap } from "@/lib/data";

export default async function SourceMapPage() {
  const viewer = await requireViewer("/app/source-map");
  const entries = await loadSourceMap(viewer);
  const category = viewer.mode === "demo" ? demoCompany.category : "your active category";
  const reviewedGaps = entries.filter((entry) => entry.crawlerAccess !== "unknown" && !entry.clientPresent).length;
  const unreviewed = entries.filter((entry) => entry.crawlerAccess === "unknown").length;
  const observations = entries.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...entries].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const providerCoverage = new Set(entries.flatMap((entry) => entry.engines)).size;
  const reviewCompletion = entries.length ? Math.round(((entries.length - unreviewed) / entries.length) * 100) : 0;
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Evidence graph</span><h1>Source Map</h1><p>The dated pages cited in answers about {category}. Citation observation is automatic; page-level brand presence stays unreviewed until checked.</p></div><Link className="button button--ink" href="/api/export/source-map">Export evidence &darr;</Link></div>
    <section className="panel panel--flush"><div className="map-summary"><div><strong>{entries.length}</strong><span>mapped URLs</span></div><div><strong>{observations}</strong><span>citation observations</span></div><div><strong>{reviewedGaps}</strong><span>confirmed source gaps</span></div><div><strong>{unreviewed}</strong><span>pages awaiting review</span></div></div>{entries.length ? <><div className="data-quality-grid"><div><span>Review completion</span><strong>{reviewCompletion}%</strong><small>{entries.length - unreviewed} of {entries.length} pages checked</small></div><div><span>Provider coverage</span><strong>{providerCoverage}</strong><small>providers represented in this map</small></div><div><span>Evidence concentration</span><strong>{observations ? Math.round((topThreeObservations / observations) * 100) : 0}%</strong><small>of observations come from the top three sources</small></div><div><span>Recurring evidence</span><strong>{entries.filter((entry) => entry.evidenceCount > 1).length}</strong><small>sources observed more than once</small></div></div><SourceMapTable entries={entries} /></> : <div className="empty-state"><h2>No Source Map yet.</h2><p>Complete onboarding, connect a provider, select buyer questions, and approve the first collection run.</p><Link className="button button--ink" href="/app/runs">Start collection &rarr;</Link></div>}</section>
  </main>;
}
