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
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Evidence graph</span><h1>Source Map</h1><p>The dated pages cited in answers about {category}. Citation observation is automatic; page-level brand presence stays unreviewed until checked.</p></div><Link className="button button--ink" href="/api/export/source-map">Export evidence &darr;</Link></div>
    <section className="panel panel--flush"><div className="map-summary"><div><strong>{entries.length}</strong><span>mapped URLs</span></div><div><strong>{entries.reduce((sum, source) => sum + source.evidenceCount, 0)}</strong><span>citation observations</span></div><div><strong>{reviewedGaps}</strong><span>confirmed source gaps</span></div><div><strong>{unreviewed}</strong><span>pages awaiting review</span></div></div>{entries.length ? <SourceMapTable entries={entries} /> : <div className="empty-state"><h2>No Source Map yet.</h2><p>Complete onboarding, connect a provider, select buyer questions, and approve the first collection run.</p><Link className="button button--ink" href="/app/runs">Start collection &rarr;</Link></div>}</section>
  </main>;
}
