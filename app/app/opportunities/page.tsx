import Link from "next/link";
import { OpportunityList } from "@/components/opportunity-list";
import { requireViewer } from "@/lib/auth";
import { loadSourceMap } from "@/lib/data";

const influence = { high: 90, medium: 68, low: 44, emerging: 44 };
const feasibility = { high: 90, medium: 62, low: 28, unknown: 20 };

export default async function OpportunitiesPage() {
  const viewer = await requireViewer("/app/opportunities");
  const entries = await loadSourceMap(viewer);
  const rows = entries.filter((source) => !source.clientPresent).map((source) => ({ ...source, score: Math.round(influence[source.influence] * .6 + feasibility[source.feasibility] * .4) })).sort((a,b) => b.score-a.score);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Ranked action layer</span><h1>Priority gaps</h1><p>Foremention separates observed citation influence from assessed feasibility. Sources marked “not reviewed” remain candidates—not confirmed brand gaps.</p></div><Link className="button button--outline" href="/app/placements">Open Action Tracker</Link></div>
    <section className="panel panel--flush">{rows.length ? <OpportunityList rows={rows} demo={viewer.mode === "demo"} /> : <div className="empty-state"><h2>No candidate gaps yet.</h2><p>Complete onboarding, collect a run, and approve its evidence before ranking source opportunities.</p></div>}</section>
  </main>;
}
