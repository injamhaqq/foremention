import { Wordmark } from "@/components/brand";
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

const formatDate = (value: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  : "—";

async function safeRead<T>(query: Promise<T[]>): Promise<T[]> {
  try { return await query; }
  catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

type ChangeExecutionAssetRow = { resolution_asset_id: string; change_specification_id: string };
type ChangeSpecificationRow = { id: string; title: string };

export default async function PrintableOutcomeValueReport() {
  const viewer = await requireViewer("/app/outcomes");
  if (viewer.mode === "demo") {
    return <main className="print-record"><header><Wordmark /><div><span>Board-ready Business Value Review</span><strong>DEMO</strong></div></header><section className="print-record__hero"><span className="eyebrow">Outcome Intelligence</span><h1>No customer outcome record in demo mode.</h1><p>The fictional demo does not create approvals, applied actions, customer-success facts, or ROI.</p></section></main>;
  }
  const context = await loadWorkspaceContext(viewer);
  if (!context) return <main className="print-record"><header><Wordmark /></header><section className="print-record__hero"><h1>Outcome report unavailable.</h1><p>Complete workspace onboarding before creating a customer outcome report.</p></section></main>;

  const assets = await safeRead(supabaseRest<OutcomeLedgerAssetRow[]>(
    `resolution_assets?select=id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,limitations,status,review_decision,created_by,submitted_by,submitted_at,approved_by,approved_at,decision_by,decision_at,approval_note,applied_by,applied_at,application_reference,application_note,created_at,updated_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
    { token: viewer.accessToken },
  ));
  const assetIds = assets.map((row) => row.id);
  const opportunityIds = Array.from(new Set(assets.map((row) => row.opportunity_id)));
  const [evidence, opportunities, followUps, executionLinks] = await Promise.all([
    assetIds.length ? safeRead(supabaseRest<OutcomeLedgerEvidenceRow[]>(`resolution_asset_evidence?select=id,resolution_asset_id,evidence_snapshot,created_at&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.asc`, { token: viewer.accessToken })) : [],
    opportunityIds.length ? safeRead(supabaseRest<OutcomeLedgerOpportunityRow[]>(`opportunities?select=id,owner_id,due_at,next_action,status,updated_at&id=in.(${opportunityIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken })) : [],
    assetIds.length ? safeRead(supabaseRest<OutcomeLedgerFollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_by,requested_at,recorded_by,completed_at,outcome,limitation&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=requested_at.desc`, { token: viewer.accessToken })) : [],
    assetIds.length ? safeRead(supabaseRest<ChangeExecutionAssetRow[]>(`change_execution_assets?select=resolution_asset_id,change_specification_id&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken })) : [],
  ]);
  const changeSpecificationIds = Array.from(new Set(executionLinks.map((row) => row.change_specification_id)));
  const changeSpecifications = changeSpecificationIds.length ? await safeRead(supabaseRest<ChangeSpecificationRow[]>(`change_specifications?select=id,title&id=in.(${changeSpecificationIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken })) : [];
  const changeById = new Map(changeSpecifications.map((row) => [row.id, row.title]));
  const linkByAssetId = new Map(executionLinks.map((row) => [row.resolution_asset_id, row.change_specification_id]));
  const assetsWithChange = assets.map((asset) => {
    const changeId = linkByAssetId.get(asset.id) || null;
    return { ...asset, change_specification_id: changeId, change_title: changeId ? changeById.get(changeId) || null : null };
  });

  const runIds = Array.from(new Set([...assetsWithChange.map((row) => row.baseline_run_id), ...followUps.map((row) => row.rerun_id)].filter((id): id is string => Boolean(id))));
  const runs = runIds.length ? await safeRead(supabaseRest<OutcomeLedgerRunRow[]>(`runs?select=id,status,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at&id=in.(${runIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken })) : [];
  const records = buildOutcomeLedger({ assets: assetsWithChange, evidence, opportunities, followUps, runs });
  const report = buildBusinessValueReport(records);
  const digest = buildExecutiveDigest(records);
  const periods = buildPeriodSummaries(records);

  return <main className="print-record">
    <header><Wordmark /><div><span>Board-ready Business Value Review</span><strong>{new Date().toLocaleDateString("en-GB")}</strong></div></header>
    <section className="print-record__hero"><span className="eyebrow">Recommendation Intelligence · Outcome Intelligence</span><h1>Business Value Review</h1><p>Operational outcomes from persisted Recommendation Records, human decisions, completed actions, and eligible later measurements.</p><p><strong>Economic ROI is not demonstrated.</strong> {report.economicValue.basis}</p></section>
    <section className="print-record__states"><div><span>Issues</span><strong>{report.issuesIdentified}</strong></div><div><span>Approved</span><strong>{report.actionsApproved}</strong></div><div><span>Completed</span><strong>{report.actionsCompleted}</strong></div><div><span>Remeasured</span><strong>{report.itemsRemeasured}</strong></div><div><span>Eligible improvements</span><strong>{report.improvementsObserved}</strong></div></section>
    <section className="print-record__answers">
      <article><span className="eyebrow">Executive digest</span><h2>What changed</h2><p>{digest.whatChanged}</p><h2>Needs attention</h2><p>{digest.needsAttention}</p><h2>Open actions</h2><p>{digest.openActions}</p><h2>Intervention observation</h2><p>{digest.interventionObservation}</p><h2>Review next</h2><p>{digest.reviewNext}</p></article>
      <article><span className="eyebrow">Reporting cadence</span><h2>Weekly · monthly · quarterly</h2>{periods.map((period) => <p key={period.label}><strong>{period.label}:</strong> {period.report.actionsCompleted} completed · {period.report.itemsRemeasured} remeasured · {period.report.improvementsObserved} improved · {period.report.regressionsObserved} regressed · {period.report.unresolvedItems} unresolved.</p>)}</article>
      {records.map((record) => <article key={record.id}>
        <span className="eyebrow">Recommendation Record {record.recommendationRecordRunId?.slice(0, 8).toUpperCase() || "not attached"} · {record.changeSpecificationId ? "execution asset" : "recommendation"}</span>
        <h2>{record.title}</h2><p>{record.problemStatement}</p>
        {record.changeSpecificationId ? <><p><strong>Change Specification:</strong> {record.changeTitle || "Untitled decision"}</p><p><strong>Execution asset:</strong> {record.assetType.replaceAll("_", " ")}</p></> : <p><strong>Recommendation:</strong> {record.assetType.replaceAll("_", " ")}</p>}
        <footer><span>Owner: {record.ownerId ? "assigned" : "unassigned"}</span><span>Due: {formatDate(record.dueAt)}</span><span>Outcome: {record.outcomeState.replaceAll("_", " ")}</span><span>Comparison eligible: {record.comparisonEligible === null ? "not assessed" : record.comparisonEligible ? "yes" : "no"}</span></footer>
        <p><strong>Attribution boundary:</strong> {record.limitation}</p>
        {record.comparison && <p><strong>Eligible observed association:</strong> brand presence {record.comparison.brandPresencePct.delta > 0 ? "+" : ""}{record.comparison.brandPresencePct.delta} pts; first mention {record.comparison.firstMentionPct.delta > 0 ? "+" : ""}{record.comparison.firstMentionPct.delta} pts. {record.comparison.interpretation}</p>}
      </article>)}
    </section>
    <footer className="print-record__footer">Foremention reports chronology and eligible observed association, not causal attribution. Operational value is not automatically economic ROI.</footer>
  </main>;
}