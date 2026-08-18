import { LazyCompetitorTracker } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole } from "@/lib/data";
import { loadTruthfulCompetitorTracking } from "@/lib/evidence-integrity-data";
import { productStateLabel, stateForCompetitors } from "@/lib/product-state";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

export default async function CompetitorsPage() {
  const viewer = await requireViewer("/app/competitors");
  const [intelligence, role] = await Promise.all([
    loadSafeWeeklyIntelligence(viewer),
    getPrimaryWorkspaceRole(viewer),
  ]);
  const comparablePair = intelligence.latest && intelligence.previous
    ? { latestId: intelligence.latest.id, previousId: intelligence.previous.id }
    : null;
  const competitors = await loadTruthfulCompetitorTracking(viewer, comparablePair);
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
        <p>Compare exact-name appearances across verified answers from finalized collections and explicitly human-reviewed cited pages. A movement delta appears only when the latest and prior collections match on buyer-question wording, provider, exact model, and methodology. Foremention reports observations, not market share or causation.</p>
        <p className="table-caption"><strong>{productStateLabel(state)}</strong> · {stateNote} · {comparablePair ? "Exact comparable pair available" : "No exact comparable pair"}</p>
      </div>
    </div>
    <LazyCompetitorTracker
      initial={competitors}
      canManage={viewer.mode === "demo" || role !== "viewer"}
      demo={viewer.mode === "demo"}
    />
  </main>;
}
