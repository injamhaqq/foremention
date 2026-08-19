import Link from "next/link";
import { OpportunityList } from "@/components/opportunity-list";
import { requireViewer } from "@/lib/auth";
import { loadRuns, loadSourceEvidenceContexts } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { productStateLabel, stateForSources } from "@/lib/product-state";

export default async function OpportunitiesPage() {
  const viewer = await requireViewer("/app/opportunities");
  const [entries, latestRuns] = await Promise.all([loadTruthfulSourceMap(viewer), loadRuns(viewer, { limit: 1 })]);
  const contexts = await loadSourceEvidenceContexts(viewer, entries.flatMap((source) => source.sourceId ? [source.sourceId] : []));
  const rows = entries.filter((source) => !source.reviewedAt || !source.clientPresent).map((source) => {
    const reviewed = Boolean(source.reviewedAt) && !source.clientPresent && source.influence !== "unknown" && source.feasibility !== "unknown" && source.route !== "unknown";
    return {
      ...source,
      // A nullable evidence count keeps unreviewed cited pages mechanically
      // distinct from actual human-reviewed opportunities.
      score: reviewed ? source.evidenceCount : null,
      evidence: source.sourceId ? contexts[source.sourceId]?.[0] : undefined,
    };
  }).sort((a,b) => Number(b.score !== null) - Number(a.score !== null) || b.evidenceCount - a.evidenceCount || b.engines.length - a.engines.length || a.domain.localeCompare(b.domain));
  const reviewed = rows.filter((row) => row.score !== null).length;
  const providers = new Set(rows.flatMap((row) => row.engines)).size;
  const observations = rows.reduce((sum, row) => sum + row.evidenceCount, 0);
  const latest = latestRuns[0] || null;
  const sourceState = stateForSources(latest ? { status: latest.status, answerCount: latest.answers, citationCount: latest.citations } : null, entries.length, entries.filter((entry) => !entry.reviewedAt).length);

  return <main className="workspace" data-product-state={rows.length ? (reviewed ? "COMPLETE" : "NEEDS_REVIEW") : sourceState}>
    <div className="workspace-heading"><div><span className="eyebrow">What should I do?</span><h1>Opportunities</h1><p>Foremention turns a cited page into an opportunity only after a person explicitly reviews it, confirms your brand is missing, and records a legitimate route. Automated crawler checks can support the review but never substitute for it. No composite score hides weak evidence.</p><p className="table-caption"><strong>{rows.length ? reviewed ? `${reviewed} reviewed opportunit${reviewed === 1 ? "y" : "ies"}` : "Needs human source review" : productStateLabel(sourceState)}</strong>{latest ? ` · Latest collection ${latest.date}` : " · No collection recorded"}</p></div><Link className="button button--outline" href="/app/resolutions">Review decisions</Link></div>
    <div className="metric-grid metric-grid--compact"><article><span>Reviewed opportunities</span><strong>{reviewed}</strong><small>human-reviewed cited pages with confirmed absence and a legitimate route</small></article><article><span>Need review</span><strong>{rows.length - reviewed}</strong><small>cited pages with no customer-facing gap decision yet</small></article><article><span>Citation observations</span><strong>{observations}</strong><small>across these cited pages</small></article><article><span>AI systems represented</span><strong>{providers}</strong><small>providers that returned these citations</small></article></div>
    <section className="panel panel--flush">{rows.length ? <OpportunityList rows={rows} demo={viewer.mode === "demo"} /> : <div className="empty-state"><h2>{sourceState === "COLLECTING" ? "Collecting evidence now." : sourceState === "FAILED_RECOVERABLE" ? "The latest collection needs another try." : entries.length ? "No missing-brand opportunity is currently supported by reviewed evidence." : "No opportunity evidence yet."}</h2><p>{sourceState === "COLLECTING" ? "Opportunities will appear only after cited pages arrive and a person reviews them." : "Review real cited sources first. Foremention will not manufacture an opportunity to fill an empty screen."}</p><Link className="button button--ink" href={entries.length ? "/app/source-map" : "/app/runs"}>{entries.length ? "Review sources" : "Collect evidence"} →</Link></div>}</section>
  </main>;
}
