import Link from "next/link";
import { PlacementBoard } from "@/components/placement-board";
import { requireViewer } from "@/lib/auth";
import { loadPlacements, loadSourceEvidenceContexts, loadSourceMap } from "@/lib/data";

export default async function PlacementsPage() {
  const viewer = await requireViewer("/app/placements");
  const [placements, sources] = await Promise.all([loadPlacements(viewer), loadSourceMap(viewer)]);
  const candidates = sources.filter((source) => !source.clientPresent).slice(0, 3);
  const contexts = await loadSourceEvidenceContexts(viewer, candidates.flatMap((source) => source.sourceId ? [source.sourceId] : []));
  return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Action layer</span><h1>Action Tracker</h1><p>Every action retains its source, legitimate route, owner, state, dated note, and optional evidence URL.</p></div><Link className="button button--ink" href="/app/opportunities">Choose an opportunity →</Link></div>{placements.length ? <PlacementBoard placements={placements} demo={viewer.mode === "demo"} /> : <section className="panel panel--flush"><div className="empty-state"><h2>No tracked actions yet.</h2><p>The next step is evidence review—not pretending an outreach task already exists.</p></div>{candidates.length > 0 && <div className="action-candidate-list">{candidates.map((source) => { const evidence = source.sourceId ? contexts[source.sourceId]?.[0] : undefined; return <Link href={`/app/sources/${source.id}`} key={source.id}><span><strong>{source.domain}</strong><small>{source.title}</small></span><span><small>{evidence?.prompt || `${source.evidenceCount} citation observation${source.evidenceCount === 1 ? "" : "s"}`}</small><b>Inspect evidence →</b></span></Link>; })}</div>}</section>}</main>;
}
