import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { buildOutcomeLedger, type OutcomeLedgerAssetRow, type OutcomeLedgerFollowUpRow, type OutcomeLedgerRunRow } from "@/lib/outcome-ledger";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

const formatDate = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const formatDelta = (value: number, unit: string) => `${value > 0 ? "+" : ""}${value}${unit}`;

/**
 * A pending forward-only migration must read as an explainable state. Any other
 * database failure still reaches the route error boundary.
 */
async function readLedgerTable<T>(query: Promise<T[]>, pending: { value: boolean }): Promise<T[]> {
  try {
    return await query;
  } catch (error) {
    if (!isMissingRelationError(error)) throw error;
    pending.value = true;
    return [];
  }
}

export default async function OutcomesPage() {
  const viewer = await requireViewer("/app/outcomes");
  if (viewer.mode === "demo") {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Change history</span><h1>Outcome Ledger</h1><p>Every applied resolution keeps its baseline measurement, approval, applied location, and comparable remeasurement in one inspectable record.</p></div><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link></div>
      <section className="panel"><div className="empty-state"><h2>The fictional demo has no outcome records.</h2><p>The demo stays read-only, so it never creates approvals, applied changes, or follow-up measurements. Create a workspace to build a real change history.</p><Link className="button button--ink" href="/signup">Create your workspace →</Link></div></section>
    </main>;
  }
  const context = await loadWorkspaceContext(viewer);
  if (!context) {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Change history</span><h1>Outcome Ledger</h1><p>Connect each approved change to its baseline, applied location, and comparable follow-up measurement.</p></div></div>
      <section className="panel"><div className="empty-state"><h2>Complete onboarding first.</h2><p>Foremention needs an organization and active project before it can keep an organization-scoped outcome record. No sample metrics are shown here.</p><Link className="button button--ink" href="/app/onboarding">Continue onboarding →</Link></div></section>
    </main>;
  }
  const pending = { value: false };
  const assets = await readLedgerTable(supabaseRest<OutcomeLedgerAssetRow[]>(
    `resolution_assets?select=id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,status,review_decision,submitted_at,approved_at,decision_at,approval_note,applied_at,application_reference,application_note,created_at,updated_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
    { token: viewer.accessToken },
  ), pending);
  const assetIds = assets.map((row) => row.id);
  const followUps = assetIds.length ? await readLedgerTable(supabaseRest<OutcomeLedgerFollowUpRow[]>(
    `resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&resolution_asset_id=in.(${assetIds.join(",")})&organization_id=eq.${context.organizationId}&order=requested_at.desc`,
    { token: viewer.accessToken },
  ), pending) : [];
  const runIds = Array.from(new Set([...assets.map((row) => row.baseline_run_id), ...followUps.map((row) => row.rerun_id)].filter((id): id is string => Boolean(id))));
  const runs = runIds.length ? await readLedgerTable(supabaseRest<OutcomeLedgerRunRow[]>(
    `runs?select=id,status,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at&id=in.(${runIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
    { token: viewer.accessToken },
  ), pending) : [];
  const records = buildOutcomeLedger({ assets, followUps, runs });
  const applied = records.filter((record) => record.status === "applied").length;
  const compared = records.filter((record) => Boolean(record.comparison)).length;
  const awaiting = records.filter((record) => record.status === "applied" && !record.comparison).length;

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Change history</span><h1>Outcome Ledger</h1><p>What did we change, and what happened afterward? Each record links the baseline measurement, the approved solution asset, where your team applied it, and the comparable follow-up measurement.</p></div><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link></div>
    <div className="metric-grid metric-grid--compact"><article><span>Resolution assets</span><strong>{records.length}</strong><small>drafted from reviewed evidence</small></article><article><span>Applied changes</span><strong>{applied}</strong><small>recorded in customer tools</small></article><article><span>Comparable remeasurements</span><strong>{compared}</strong><small>same questions, same providers</small></article><article><span>Awaiting remeasurement</span><strong>{awaiting}</strong><small>applied but not yet compared</small></article></div>
    {pending.value && <section className="panel outcome-ledger__pending" role="status"><strong>Resolution records are not enabled yet</strong><p>This workspace is missing the Foremention resolution tables, so no change history can be read. A workspace owner must apply the pending database migration. No customer record was lost, and nothing on this page is estimated.</p></section>}
    <section className="panel panel--flush">
      {records.length ? <div className="outcome-ledger">{records.map((record) => <article className="outcome-ledger__record" key={record.id}>
        <header><div><span className="eyebrow">{record.assetType.replaceAll("_", " ")}</span><h2>{record.title}</h2><p>{record.problemStatement}</p></div><span className={`outcome-ledger__status outcome-ledger__status--${record.status}`}>{record.status.replaceAll("_", " ")}</span></header>
        <ol className="outcome-ledger__chain">{record.steps.map((step) => <li key={step.key} data-done={step.done ? "true" : "false"} aria-label={`${step.label}: ${step.done ? "complete" : "not complete"}`}><strong>{step.label}</strong><span>{step.detail}</span><small>{step.done ? "Complete" : "Not complete"} · {formatDate(step.at)}</small></li>)}</ol>
        {record.applicationNote && <p className="outcome-ledger__limitation"><strong>Application note:</strong> {record.applicationNote}</p>}
        {record.comparison ? <div className="outcome-ledger__comparison">
          <div className="metric-grid metric-grid--compact"><article><span>Brand presence</span><strong>{formatDelta(record.comparison.brandPresencePct.delta, " pts")}</strong><small>{record.comparison.brandPresencePct.before}% → {record.comparison.brandPresencePct.after}%</small></article><article><span>First mention</span><strong>{formatDelta(record.comparison.firstMentionPct.delta, " pts")}</strong><small>{record.comparison.firstMentionPct.before}% → {record.comparison.firstMentionPct.after}%</small></article><article><span>Citations</span><strong>{formatDelta(record.comparison.citationCount.delta, "")}</strong><small>{record.comparison.citationCount.before} → {record.comparison.citationCount.after}</small></article><article><span>New sources</span><strong>{formatDelta(record.comparison.newSourceCount.delta, "")}</strong><small>{record.comparison.newSourceCount.before} → {record.comparison.newSourceCount.after}</small></article></div>
          <p className="outcome-ledger__limitation">{record.comparison.interpretation}</p>
        </div> : <p className="outcome-ledger__limitation">{record.limitation}</p>}
      </article>)}</div> : <div className="empty-state"><h2>No outcome records yet.</h2><p>This ledger fills in as your team turns a reviewed gap into an approved solution asset, records where it was applied, and runs a comparable follow-up measurement.</p><Link className="button button--ink" href="/app/resolutions">Start in Resolution Center →</Link></div>}
    </section>
    <aside className="panel outcome-ledger__boundary"><strong>Decision boundary</strong><p>A follow-up change is an observed before-and-after association. Foremention never claims an applied asset caused an AI provider to change its answer, and never promises rankings, traffic, leads, or revenue.</p></aside>
  </main>;
}
