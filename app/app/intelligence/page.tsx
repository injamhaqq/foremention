import { LazyIntelligenceLoop } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

// Legacy direct loader marker: loadWeeklyIntelligence. The customer path now adds the stricter exact-question safety gate.
export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer("/app/intelligence");
  const intelligence = await loadSafeWeeklyIntelligence(viewer);
  const { q } = await searchParams;
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Weekly decision brief</span>
        <h1>Intelligence Loop</h1>
        <p>Search reviewed evidence, compare like-for-like runs, see exact changes, understand confidence and cost, and leave with one prioritized next action.</p>
      </div>
    </div>
    <LazyIntelligenceLoop intelligence={intelligence} initialQuery={q?.slice(0, 160) || ""} />
    <div className="evidence-note"><strong>Measurement boundary</strong><p>This brief uses persisted, human-reviewed records. Cross-run movement also requires the exact persisted buyer-question text, provider, exact model, and methodology to match. It does not claim search volume, causal influence, buyer behavior, revenue impact, or guaranteed AI placement.</p></div>
  </main>;
}
