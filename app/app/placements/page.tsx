import Link from "next/link";
import { PlacementBoard } from "@/components/placement-board";
import { requireViewer } from "@/lib/auth";
import { loadPlacements } from "@/lib/data";

export default async function PlacementsPage() {
  const viewer = await requireViewer("/app/placements");
  const placements = await loadPlacements(viewer);
  return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Action layer</span><h1>Source action pipeline</h1><p>Every opportunity has a source, a legitimate route, an owner, and an observable state.</p></div><Link className="button button--ink" href="/app/opportunities">Choose an opportunity →</Link></div>{placements.length ? <PlacementBoard placements={placements} /> : <div className="empty-state empty-state--border"><h2>No source opportunities yet.</h2><p>Qualify a Source Map entry before adding it to the action pipeline.</p></div>}</main>;
}
