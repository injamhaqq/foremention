import { IntelligenceLoop } from "@/components/intelligence-loop";
import { requireViewer } from "@/lib/auth";
import { loadWeeklyIntelligence } from "@/lib/intelligence-loop";

export default async function IntelligencePage() {
  const viewer = await requireViewer("/app/intelligence");
  const intelligence = await loadWeeklyIntelligence(viewer);
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Weekly decision brief</span>
        <h1>Intelligence Loop</h1>
        <p>Search reviewed evidence, compare like-for-like runs, see exact changes, understand confidence and cost, and leave with one prioritized next action.</p>
      </div>
    </div>
    <IntelligenceLoop intelligence={intelligence} />
    <div className="evidence-note"><strong>Measurement boundary</strong><p>This brief uses persisted, human-reviewed records. It does not claim search volume, causal influence, buyer behavior, revenue impact, or guaranteed AI placement.</p></div>
  </main>;
}
