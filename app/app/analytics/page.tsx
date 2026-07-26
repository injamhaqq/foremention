import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { loadRuns, loadSourceMap } from "@/lib/data";

export default async function AnalyticsPage() {
  const viewer = await requireViewer("/app/analytics");
  const [allRuns, sources] = await Promise.all([loadRuns(viewer), loadSourceMap(viewer)]);
  const runs = allRuns.filter((run) => run.status === "complete").reverse();

  if (!runs.length) return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Observed performance</span><h1>Recommendation analytics</h1><p>Analytics begin only after a workspace owner reviews and approves collected evidence.</p></div></div><section className="panel empty-state empty-state--border"><h2>No reviewed trend exists yet.</h2><p>Run connected providers, inspect their answers and citations, then approve the run. Foremention will never substitute demo values for customer data.</p><Link className="button button--ink" href="/app/runs">Open Answer Runs &rarr;</Link></section></main>;

  const latest = runs.at(-1)!;
  const earliest = runs[0];
  const recurringSources = sources.filter((source) => source.evidenceCount > 1).length;
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Observed performance</span><h1>Recommendation analytics</h1><p>Every value below comes from approved runs. It measures observed answers, not guaranteed buyer behavior or revenue impact.</p></div></div>
    <div className="metric-grid"><article><span>Brand presence</span><strong>{latest.presence}%</strong><small>{latest.presence - earliest.presence >= 0 ? "+" : ""}{latest.presence - earliest.presence} points vs first approved run</small></article><article><span>First-mention share</span><strong>{latest.firstMention}%</strong><small>Latest approved run</small></article><article><span>Citation observations</span><strong>{latest.citations}</strong><small>{recurringSources} recurring mapped sources</small></article><article><span>Reviewed runs</span><strong>{runs.length}</strong><small>{runs.reduce((sum, run) => sum + run.answers, 0)} approved answers</small></article></div>
    <div className="analytics-grid"><section className="panel panel--wide"><span className="eyebrow">Brand presence</span><h2>Approved collection trend</h2><div className="trend-chart trend-chart--dynamic" style={{ gridTemplateColumns: `repeat(${Math.min(runs.length, 12)}, minmax(46px, 1fr))` }} role="img" aria-label={`Brand presence across ${runs.length} approved runs`}>{runs.slice(-12).map((run, index) => <div key={run.id}><i style={{ height: `${Math.max(2, run.presence)}%` }} /><span>R{Math.max(1, runs.length - 11) + index}</span><small>{run.presence}%</small></div>)}</div><p className="table-caption">Run IDs, provider responses, dates, and citations remain available in Answer Runs and the Evidence Vault.</p></section><section className="panel"><span className="eyebrow">Referral measurement</span><h2>Not connected.</h2><div className="empty-state empty-state--compact"><p>Foremention does not report AI referral sessions or conversions until an approved analytics integration supplies real events.</p></div></section></div>
  </main>;
}
