import Link from "next/link";
import { OpportunityList } from "@/components/opportunity-list";
import { requireViewer } from "@/lib/auth";
import { loadSourceEvidenceContexts, loadSourceMap } from "@/lib/data";

const influence = { high: 90, medium: 68, low: 44, emerging: 44, unknown: 20 };
const feasibility = { high: 90, medium: 62, low: 28, unknown: 20 };

export default async function OpportunitiesPage() {
  const viewer = await requireViewer("/app/opportunities");
  const entries = await loadSourceMap(viewer);
  const contexts = await loadSourceEvidenceContexts(viewer, entries.flatMap((source) => source.sourceId ? [source.sourceId] : []));
  const rows = entries.filter((source) => !source.clientPresent).map((source) => {
    const reviewed = source.crawlerAccess !== "unknown" && source.influence !== "unknown" && source.feasibility !== "unknown" && source.route !== "unknown";
    return {
      ...source,
      score: reviewed ? Math.round(influence[source.influence] * .6 + feasibility[source.feasibility] * .4) : null,
      evidence: source.sourceId ? contexts[source.sourceId]?.[0] : undefined,
    };
  }).sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || b.evidenceCount - a.evidenceCount || a.domain.localeCompare(b.domain));
  const reviewed = rows.filter((row) => row.score !== null).length;
  const providers = new Set(rows.flatMap((row) => row.engines)).size;
  const observations = rows.reduce((sum, row) => sum + row.evidenceCount, 0);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Evidence review queue</span><h1>Priority gaps</h1><p>Observed citations appear here first. A priority score appears only after someone verifies the page, brand presence, influence, and a legitimate route.</p></div><Link className="button button--outline" href="/app/placements">Open Action Tracker</Link></div>
    <div className="metric-grid metric-grid--compact"><article><span>Confirmed gaps</span><strong>{reviewed}</strong><small>reviewed and rankable</small></article><article><span>Awaiting review</span><strong>{rows.length - reviewed}</strong><small>not yet called a gap</small></article><article><span>Observed citations</span><strong>{observations}</strong><small>from approved evidence</small></article><article><span>Provider coverage</span><strong>{providers}</strong><small>represented in this map</small></article></div>
    <section className="panel panel--flush">{rows.length ? <OpportunityList rows={rows} demo={viewer.mode === "demo"} /> : <div className="empty-state"><h2>No candidate gaps yet.</h2><p>This page ranks legitimate opportunities only after cited pages are reviewed. Complete onboarding, collect a run, and approve its evidence first.</p><Link className="button button--ink" href="/app/runs">Collect evidence →</Link></div>}</section>
  </main>;
}
