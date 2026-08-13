import { LazyCompetitorTracker } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { loadSafeCompetitorTracking } from "@/lib/competitor-intelligence";
import { getPrimaryWorkspaceRole } from "@/lib/data";
import { productStateLabel, stateForCompetitors } from "@/lib/product-state";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

export default async function CompetitorsPage() {
  const viewer = await requireViewer("/app/competitors");
  const [role, intelligence] = await Promise.all([
    getPrimaryWorkspaceRole(viewer),
    loadSafeWeeklyIntelligence(viewer),
  ]);
  const competitors = await loadSafeCompetitorTracking(viewer, {
    latest: intelligence.latest ? { id: intelligence.latest.id, date: intelligence.latest.date } : null,
    previous: intelligence.previous ? { id: intelligence.previous.id, date: intelligence.previous.date } : null,
  });
  const state = stateForCompetitors(competitors);
  const activeCount = competitors.filter((item) => item.active).length;
  const stateNote = !competitors.length
    ? "No comparison brands configured yet"
    : activeCount === 0
      ? `${competitors.length} tracked · all paused`
      : `${activeCount} active of ${competitors.length} tracked`;
  const comparisonNote = intelligence.latest
    ? intelligence.previous
      ? `Exact reviewed comparison: ${intelligence.previous.date} → ${intelligence.latest.date}`
      : `Current reviewed baseline: ${intelligence.latest.date} · no exact prior pair`
    : "No reviewed comparison baseline yet";

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Competitive evidence</span>
        <h1>Competitor tracking</h1>
        <p>Compare exact-name appearances in verified AI answers from the current reviewed baseline. Checked cited-page observations stay separate from AI-answer movement. Foremention reports observations, not market share or causation.</p>
        <p className="table-caption"><strong>{productStateLabel(state)}</strong> · {stateNote} · {comparisonNote}</p>
      </div>
    </div>
    <LazyCompetitorTracker
      initial={competitors}
      canManage={viewer.mode === "demo" || role !== "viewer"}
      demo={viewer.mode === "demo"}
    />
  </main>;
}
