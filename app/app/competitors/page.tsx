import { LazyCompetitorTracker } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadCompetitorTracking } from "@/lib/data";

export default async function CompetitorsPage() {
  const viewer = await requireViewer("/app/competitors");
  const [competitors, role] = await Promise.all([loadCompetitorTracking(viewer), getPrimaryWorkspaceRole(viewer)]);
  return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Competitive evidence</span><h1>Competitor tracking</h1><p>Compare exact-name appearances across persisted AI answers and human-reviewed cited pages. Foremention reports observations, not market share or causation.</p></div></div><LazyCompetitorTracker initial={competitors} canManage={viewer.mode === "demo" || role !== "viewer"} demo={viewer.mode === "demo"} /></main>;
}
