import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import {
  buildOutcomeLedger,
  type OutcomeLedgerAssetRow,
  type OutcomeLedgerEvidenceRow,
  type OutcomeLedgerFollowUpRow,
  type OutcomeLedgerOpportunityRow,
  type OutcomeLedgerRunRow,
} from "@/lib/outcome-ledger";
import { buildBusinessValueReport, buildExecutiveDigest, buildPeriodSummaries } from "@/lib/value-report";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

const formatDate = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const formatDelta = (value: number, unit: string) => `${value > 0 ? "+" : ""}${value}${unit}`;
const outcomeLabel = (value: string) => value.replaceAll("_", " ");

type ChangeExecutionAssetRow = { resolution_asset_id: string; change_specification_id: string };
type ChangeSpecificationRow = { id: string; title: string };

async function readLedgerTable<T>(query: Promise<T[]>, pending: { value: boolean }): Promise<T[]> {
  try { return await query; }
  catch (error) {
    if (!isMissingRelationError(error)) throw error;
    pending.value = true;
    return [];
  }
}

export default async function OutcomesPage() {
  const viewer = await requireViewer("/app/outcomes");
  if (viewer.mode === "demo") {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Outcome intelligence</span><h1>Outcome Ledger</h1><p>Observation → evidence → recommendation → decision → action → owner → completion → later measurement → observed outcome.</p></div><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link></div>
      <section className="panel"><div className="empty-state"><h2>The fictional demo has no outcome records.</h2><p>The demo stays read-only, so it never invents approvals, customer-success facts, economic ROI, applied changes, or follow-up measurements. Create a workspace to build a real value history.</p><Link className="button button--ink" href="/signup">Create your workspace →</Link></div></section>
    </main>;
  }
  const context = await loadWorkspaceContext(viewer);
  if (!context) {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Outcome intelligence</span><h1>Outcome Ledger</h1><p>Connect reviewed Recommendation Records to decisions, owned actions, completion, and eligible later observations.</p></div></div>
      <section className="panel"><div className="empty-state"><h2>Complete onboarding first.</h2><p>Foremention needs an organization and active project before it can keep an organization-scoped outcome record. No sample metrics are shown here.</p><Link className="button button--ink" href="/app/onboarding">Continue onboarding →</Link></div></section>
    </main>;
  }

  const pending = { value: false };
  const assets = await readLedgerTable(supabaseRest<OutcomeLedgerAssetRow[]>(
    `resolution_assets?select=id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,limitations,status,review_decision,created_by,submitted_by,submitted_at,approved_by,approved_at,decision_by,decision_at,approval_note,applied_by,applied_at,application_reference,application_note,created_at,updated_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
    { token: viewer.accessToken },
  ), pending);
  const assetIds = assets.map((row) => row.id);
  const opportunityIds = Array.from(new Set(assets.map((row) => row.opportunity_id)));
  const [evidence, opportunities, followUps, executionLinks] = await Promise.all([
    assetIds.length ? readLedgerTable(supabaseRest<OutcomeLedgerEvidenceRow[]>(`resolution_asset_evidence?select=id,resolution_asset_id,evidence_snapshot,created_at&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.asc`, { token: viewer.accessToken }), pending) : [],
    opportunityIds.length ? readLedgerTable(supabaseRest<OutcomeLedgerOpportunityRow[]>(`opportunities?select=id,owner_id,due_at,next_action,status,updated_at&id=in.(${opportunityIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken }), pending) : [],
    assetIds.length ? readLedgerTable(supabaseRest<OutcomeLedgerFollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_by,requested_at,recorded_by,completed_at,outcome,limitation&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=requested_at.desc`, { token: viewer.accessToken }), pending) : [],
    assetIds.length ? readLedgerTable(supabaseRest<ChangeExecutionAssetRow[]>(`change_execution_assets?select=resolution_asset_id,change_specification_id&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken }), pending) : [],
  ]);
  const changeSpecificationIds = Array.from(new Set(executionLinks.map((row) => row.change_specification_id)));
  const changeSpecifications = changeSpecificationIds.length ? await readLedgerTable(supabaseRest<ChangeSpecificationRow[]>(`change_specifications?select=id,title&id=in.(${changeSpecificationIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken }), pending) : [];
  const changeById = new Map(changeSpecifications.map((row) => [row.id, row.title]));
  const linkByAssetId = new Map(executionLinks.map((row) => [row.resolution_asset_id, row.change_specification_id]));
  const assetsWithChange = assets.map((asset) => {
    const changeId = linkByAssetId.get(asset.id) || null;
    return { ...asset, change_specification_id: changeId, change_title: changeId ? changeById.get(changeId) || null : null };
  });

  const runIds = Array.from(new Set([...assetsWithChange.map((row) => row.baseline_run_id), ...followUps.map((row) => row.rerun_id)].filter((id): id is string => Boolean(id))));
  const runs = runIds.length ? await readLedgerTable(supabaseRest<OutcomeLedgerRunRow[]>(`runs?select=id,status,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at&id=in.(${runIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken }), pending) : [];

  const records = buildOutcomeLedger({ assets: assetsWithChange, evidence, opportunities, followUps, runs });
  const value = buildBusinessValueReport(records);
  const digest = buildExecutiveDigest(records);
  const periods = buildPeriodSummaries(records);
  const eligibleOutcomes = records.filter((record) => record.comparisonEligible === true && record.comparison).length;
  const openActions = records.filter((record) => record.steps.find((step) => step.key === "action")?.done && !record.steps.find((step) => step.key === "completion")?.done).length;

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Outcome intelligence</span><h1>What changed, what did we do, and what happened afterward?</h1><p>The Outcome Ledger connects reviewed Recommendation Record evidence to human decisions, owned actions, completion, and later measurements without claiming that chronology proves causation.</p></div><div className="workspace-heading__actions"><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link><Link className="button button--ink" href="/app/outcomes/print">Board-ready export</Link></div></div>

    {pending.value && <section className="panel outcome-ledger__pending" role="status"><strong>Outcome records are not fully enabled yet</strong><p>This workspace is missing one or more Foremention outcome/resolution tables, so the page is withholding affected records instead of estimating them. A workspace owner must apply the pending database migration.</p></section>}

    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Executive digest</span><h2>The CMO view, grounded in the ledger.</h2></div><Link href="/app/analytics">Open exact Comparisons →</Link></div><div className="system-grid"><article><span>01</span><h3>What changed?</h3><p>{digest.whatChanged}</p></article><article><span>02</span><h3>What needs attention?</h3><p>{digest.needsAttention}</p></article><article><span>03</span><h3>Where are competitors moving?</h3><p>{digest.competitorMovement}</p></article><article><span>04</span><h3>What actions are open?</h3><p>{digest.openActions}</p></article><article><span>05</span><h3>Did an intervention coincide with change?</h3><p>{digest.interventionObservation}</p></article><article><span>06</span><h3>What should we review next?</h3><p>{digest.reviewNext}</p></article></div></section>

    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Business value report</span><h2>Operational value first. Economic attribution only when verified.</h2></div></div><div className="metric-grid metric-grid--compact"><article><span>Issues identified</span><strong>{value.issuesIdentified}</strong><small>reviewed baselines attached</small></article><article><span>Actions approved</span><strong>{value.actionsApproved}</strong><small>human decision recorded</small></article><article><span>Actions completed</span><strong>{value.actionsCompleted}</strong><small>application recorded</small></article><article><span>Items remeasured</span><strong>{value.itemsRemeasured}</strong><small>later measurement completed</small></article><article><span>Improvements observed</span><strong>{value.improvementsObserved}</strong><small>eligible directional movement</small></article><article><span>Regressions observed</span><strong>{value.regressionsObserved}</strong><small>eligible directional movement</small></article><article><span>Competitive gaps addressed</span><strong>{value.competitiveGapsAddressed}</strong><small>completed comparison interventions</small></article><article><span>Unresolved items</span><strong>{value.unresolvedItems}</strong><small>completion or eligible outcome still open</small></article></div><div className="inline-notice" role="note"><strong>Economic ROI: not demonstrated.</strong><p>{value.economicValue.basis} Current operational value: {value.operationalValue}</p></div></section>

    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Reporting cadence</span><h2>Weekly, monthly, and quarterly value summaries.</h2></div></div><div className="system-grid">{periods.map((period) => <article key={period.label}><span>{period.days}d</span><h3>{period.label}</h3><p><strong>{period.report.actionsCompleted}</strong> completed · <strong>{period.report.itemsRemeasured}</strong> remeasured · <strong>{period.report.improvementsObserved}</strong> improved · <strong>{period.report.regressionsObserved}</strong> regressed · <strong>{period.report.unresolvedItems}</strong> unresolved</p></article>)}</div></section>

    <div className="metric-grid metric-grid--compact"><article><span>Ledger records</span><strong>{records.length}</strong><small>reviewed intervention chains</small></article><article><span>Open actions</span><strong>{openActions}</strong><small>approved, not completed</small></article><article><span>Eligible outcomes</span><strong>{eligibleOutcomes}</strong><small>exact comparison gate passed</small></article><article><span>Incomparable measurements</span><strong>{value.incomparableMeasurements}</strong><small>retained, outcome comparison withheld</small></article></div>

    <section className="panel panel--flush">
      {records.length ? <div className="outcome-ledger">{records.map((record) => <article className="outcome-ledger__record" key={record.id}>
        <header><div><span className="eyebrow">{record.changeSpecificationId ? "Execution asset" : "Recommendation"}</span><h2>{record.title}</h2><p>{record.problemStatement}</p>{record.recommendationRecordRunId && <small>Recommendation Record · {record.recommendationRecordRunId.slice(0, 8).toUpperCase()}</small>}{record.changeSpecificationId ? <><small>Change Specification · {record.changeTitle || "Untitled decision"}</small><small>Execution asset · {record.assetType.replaceAll("_", " ")}</small></> : <small>Recommendation · {record.assetType.replaceAll("_", " ")}</small>}</div><span className={`outcome-ledger__status outcome-ledger__status--${record.status}`}>{record.status.replaceAll("_", " ")}</span></header>
        <ol className="outcome-ledger__chain">{record.steps.map((step) => <li key={step.key} data-done={step.done ? "true" : "false"} aria-label={`${step.label}: ${step.done ? "complete" : "not complete"}`}><strong>{step.label}</strong><span>{step.detail}</span><small>{step.done ? "Complete" : "Not complete"} · {formatDate(step.at)}{step.actorId ? " · actor recorded" : ""}</small></li>)}</ol>
        <div className="inline-notice" role="note"><strong>Confidence: {record.confidence.replaceAll("_", " ")}</strong><p>{record.confidenceBasis}</p></div>
        {record.applicationNote && <p className="outcome-ledger__limitation"><strong>Application note:</strong> {record.applicationNote}</p>}
        {record.comparison ? <div className="outcome-ledger__comparison"><div className="panel-heading"><div><span className="eyebrow">Eligible observed outcome</span><h3>{outcomeLabel(record.outcomeState)}</h3></div></div><div className="metric-grid metric-grid--compact"><article><span>Brand presence</span><strong>{formatDelta(record.comparison.brandPresencePct.delta, " pts")}</strong><small>{record.comparison.brandPresencePct.before}% → {record.comparison.brandPresencePct.after}%</small></article><article><span>First mention</span><strong>{formatDelta(record.comparison.firstMentionPct.delta, " pts")}</strong><small>{record.comparison.firstMentionPct.before}% → {record.comparison.firstMentionPct.after}%</small></article><article><span>Citations</span><strong>{formatDelta(record.comparison.citationCount.delta, "")}</strong><small>{record.comparison.citationCount.before} → {record.comparison.citationCount.after}</small></article><article><span>New sources</span><strong>{formatDelta(record.comparison.newSourceCount.delta, "")}</strong><small>{record.comparison.newSourceCount.before} → {record.comparison.newSourceCount.after}</small></article></div><p className="outcome-ledger__limitation">{record.comparison.interpretation}</p></div> : record.measurementStatus === "incomparable" ? <p className="outcome-ledger__limitation"><strong>Comparison withheld:</strong> a later measurement exists, but Foremention could not prove exact comparison eligibility. The observation remains in history without a before-and-after outcome label.</p> : <p className="outcome-ledger__limitation">{record.limitation}</p>}
        {record.limitations.length > 0 && <details><summary>Limitations ({record.limitations.length})</summary><ul>{record.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details>}
      </article>)}</div> : <div className="empty-state"><h2>No outcome records yet.</h2><p>This ledger fills in as reviewed Recommendation Record evidence becomes a recommendation or Change Specification, a human decision, an owned action, a completed intervention, and an eligible later measurement.</p><Link className="button button--ink" href="/app/resolutions">Start in Resolution Center →</Link></div>}
    </section>

    <aside className="panel outcome-ledger__boundary"><strong>Decision boundary</strong><p>A later change is an observed before-and-after association only when Foremention can prove the exact comparison protocol. It never claims an intervention caused an AI provider to change its answer, and it never converts operational movement into invented traffic, leads, revenue, or dollar ROI.</p></aside>
  </main>;
}
