import { LazyCompetitorTracker } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadCompetitorTracking } from "@/lib/data";
import { productStateLabel, stateForCompetitors } from "@/lib/product-state";

export default async function CompetitorsPage() {
  const viewer = await requireViewer("/app/competitors");
  const [competitors, role] = await Promise.all([
    loadCompetitorTracking(viewer),
    getPrimaryWorkspaceRole(viewer),
  ]);
  const state = stateForCompetitors(competitors);
  const activeCount = competitors.filter((item) => item.active).length;
  const stateNote = !competitors.length
    ? "No comparison brands configured yet"
    : activeCount === 0
      ? `${competitors.length} tracked · all paused`
      : `${activeCount} active of ${competitors.length} tracked`;

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Competitive evidence</span>
        <h1>Competitor tracking</h1>
        <p>Compare exact-name appearances across persisted AI answers and human-reviewed cited pages. Foremention reports observations, not market share or causation.</p>
        <p className="table-caption"><strong>{productStateLabel(state)}</strong> · {stateNote}</p>
      </div>
    </div>
    <LazyCompetitorTracker
      initial={competitors}
      canManage={viewer.mode === "demo" || role !== "viewer"}
      demo={viewer.mode === "demo"}
    />
  </main>;
}
