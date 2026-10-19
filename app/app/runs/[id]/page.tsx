import Link from "next/link";
import { notFound } from "next/navigation";
import { RecommendationAnswerRecord } from "@/components/recommendation-answer-record";
import { DecisionReviewDownload } from "@/components/decision-review-download";
import { RunReview } from "@/components/run-review";
import { RunCancel } from "@/components/run-cancel";
import { RunRerunButton } from "@/components/run-rerun-button";
import { RunManifestPanel } from "@/components/run-manifest-panel";
import { describeRunFailure } from "@/lib/run-failure-reason";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadRunAnswers, loadRunConfiguration, loadRunCostEvents, loadRuns, loadWorkspaceContext, MAX_RUN_COST_EVENTS } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { loadProviderRunDiagnostics } from "@/lib/provider-run-diagnostics";
import { loadRunManifest } from "@/lib/run-manifest";
import { supabaseRest } from "@/lib/supabase-rest";
import { isSourceEntryId } from "@/lib/source-record-location";
import { findSourceXrayTarget } from "@/lib/source-xray-link";

const usd = (value: number) => `$${value.toFixed(value < .01 ? 4 : 2)}`;

export default async function RunDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ first_evidence?: string; source?: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const { first_evidence: firstEvidenceParam = "", source: focusSourceParam = "" } = await searchParams;
  const focusSourceId = isSourceEntryId(focusSourceParam) ? focusSourceParam : undefined;
  const firstEvidence = firstEvidenceParam === "1";
  const [runs, answers, providerDiagnostics, costEvents, configuration, context, role, manifest] = await Promise.all([
    loadRuns(viewer),
    loadRunAnswers(viewer, id),
    loadProviderRunDiagnostics(viewer, id),
    loadRunCostEvents(viewer, id),
    loadRunConfiguration(viewer, id, { includeFailed: true }),
    loadWorkspaceContext(viewer),
    getPrimaryWorkspaceRole(viewer),
    loadRunManifest(viewer, id),
  ]);
  const run = runs.find((item) => item.id === id);
  if (!run) notFound();
  const canExportDecision = viewer.mode !== "demo" && Boolean(viewer.accessToken && context) &&
    (role === "owner" || role === "admin" || role === "analyst");
  // Bounded, active-project decisions only. Never use a service role for export.
  // The download route independently rechecks role, evidence and decision scope.
  const decisions: Array<{ id: string; decision_kind: string; decision_state: string; decided_at: string }> =
    canExportDecision && context && viewer.accessToken
      ? await supabaseRest<Array<{ id: string; decision_kind: string; decision_state: string; decided_at: string }>>(
        `record_decisions?select=id,decision_kind,decision_state,decided_at&baseline_run_id=eq.${encodeURIComponent(run.id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&order=decided_at.desc&limit=20`,
        { token: viewer.accessToken },
      ).catch(() => [])
      : [];
    const sourceMap = ["complete", "partial"].includes(run.status) ? await loadTruthfulSourceMap(viewer, { runId: run.id }) : [];
  // /app/sources/[id] lands here; the first citation that maps to that entry
  // gets the #source-<id> anchor and its evidence inspection opens in place.
  const focusAnchor = focusSourceId && run.status !== "review" ? (() => {
    for (const answer of answers) {
      const index = answer.citations.findIndex((citation) => findSourceXrayTarget(citation.url, sourceMap)?.id === focusSourceId);
      if (index >= 0) return { answerId: answer.id, index };
    }
    return null;
  })() : null;
  const canInspectSources = viewer.mode === "demo" || role === "owner" || role === "admin" || role === "analyst";
  const providerDiagnosticsByAnswer = new Map(providerDiagnostics.map((item) => [item.answerId, item]));
  const costEventsComplete = costEvents.length <= MAX_RUN_COST_EVENTS;
  const detailedCostEvents = costEventsComplete ? costEvents : [];
  const totalCost = manifest?.actualCostUsd ?? 0;
  const hasRecordedCost = Boolean(manifest && (manifest.actualCostUsd > 0 || detailedCostEvents.length));
  const totalTokens = detailedCostEvents.some((event) => event.totalTokens !== null) ? detailedCostEvents.reduce((sum, event) => sum + Number(event.totalTokens || 0), 0) : null;
  const providerCosts = Array.from(detailedCostEvents.reduce((groups, event) => {
    const key = `${event.provider}\u0000${event.model}`;
    const current = groups.get(key) || { provider: event.provider, model: event.model, cost: 0, tokens: 0, events: 0, sources: new Set<string>() };
    current.cost += event.costUsd;
    current.tokens += Number(event.totalTokens || 0);
    current.events += 1;
    current.sources.add(event.costSource);
    groups.set(key, current);
    return groups;
  }, new Map<string, { provider: string; model: string; cost: number; tokens: number; events: number; sources: Set<string> }>()).values());
  const failure = run.status === "failed" ? describeRunFailure(run.errorSummary) : null;
  const canStartCollection = viewer.mode === "demo" || role === "owner" || role === "admin" || role === "analyst";
  const emptyState = failure
    ? { title: failure.title, body: failure.detail }
    : run.status === "cancelled"
      ? { title: "This collection was cancelled.", body: "No answers or citations were added to the evidence trail." }
      : ["complete", "partial", "review"].includes(run.status)
        ? { title: "No usable answers were returned.", body: "The collection finished without evidence that can be reviewed or published." }
        : { title: "Answers have not arrived yet.", body: "The collection is queued, running, or waiting for a provider retry." };

  return <main className="workspace canonical-record-page">
    <div className="workspace-heading canonical-record-page__heading">
      <div>
        <span className="eyebrow">Recommendation Record · {run.id.slice(0, 8).toUpperCase()}</span>
        <h1>{run.status === "review" ? "Review Recommendation Record" : "Recommendation Record"}</h1>
        <p>{run.date} · {run.answers} answer{run.answers === 1 ? "" : "s"} · {run.citations} returned citation observation{run.citations === 1 ? "" : "s"}. Every answer, citation and review state remains tied to this exact collection.</p>
      </div>
      <Link className="button button--outline" href="/app/runs">&larr; All Records</Link>
    </div>

    {firstEvidence && <section className="panel canonical-first-evidence">
      <span className="eyebrow">Your first real evidence</span>
      <h2>Read the exact AI answer, then inspect its evidence here.</h2>
      <p>{run.status === "review" ? "Review the recorded answer and every returned citation below. Approve the run only when they match what the AI system actually returned. Evidence inspection stays inside this Recommendation Record." : sourceMap.length ? "This finalized Recommendation Record has mapped source evidence attached to its returned citations. Expand Evidence inspection under a citation to check reachability, saved page observations, credibility limits, comments, and explicit human review without leaving the record." : "This collection is recorded. When no run-scoped mapped source is available, keep the provider answer and returned citation as the evidence boundary rather than borrowing another collection's source record."}</p>
      <ol className="record-steps"><li>Read the exact buyer question and provider answer.</li><li>Check the provider-returned citation without changing it.</li><li>Inspect mapped source evidence inside this Recommendation Record when available.</li><li>Keep automated retrieval observations separate from human review before acting.</li></ol>
    </section>}

    {run.status === "review" && <RunReview runId={run.id} />}
    {(run.status === "queued" || run.status === "running") && <RunCancel runId={run.id} />}
    {failure && <section className="panel run-failure" role="alert" aria-labelledby="run-failure-title" data-failure-kind={failure.kind}>
      <span className="eyebrow">Collection failed</span>
      <h2 id="run-failure-title">{failure.title}</h2>
      <p>{failure.detail}</p>
      {failure.technicalDetail && <details className="run-failure__technical"><summary>Technical detail</summary><p><code>{failure.technicalDetail}</code></p></details>}
      {configuration && canStartCollection
        ? <RunRerunButton mode="retry" promptIds={configuration.promptIds} provider={configuration.provider} demo={viewer.mode === "demo"} />
        : <p className="table-caption">{canStartCollection ? "The original questions for this collection are no longer available to retry. Start a new collection from Questions." : "Only owners, admins, and analysts can retry a collection."}</p>}
      {!answers.length && <p className="table-caption">The provider did not return evidence for this collection, so no answers or citations were saved.</p>}
      {!failure.retryable && <p className="table-caption">This failure usually needs a configuration fix first. <Link className="text-link" href="/app/support">Contact support</Link></p>}
    </section>}
    {["complete", "partial"].includes(run.status) && configuration && <RunRerunButton promptIds={configuration.promptIds} provider={configuration.provider} demo={viewer.mode === "demo"} />}

    {manifest && <RunManifestPanel manifest={manifest} />}

    {decisions.length > 0 && <section className="panel" aria-label="Human decisions and review packets">
      <div className="panel-heading panel-heading--padded">
        <div><span className="eyebrow">Recorded human decisions</span><h2>Decision review and follow-up</h2></div>
      </div>
      <div className="panel-body">
        <p>Download a private evidence-bound decision review. A packet is withheld when an approved decision&apos;s evidence, ownership, or follow-up comparison cannot be verified; it is not proof of revenue or causation.</p>
        {decisions.map((decision) => <div key={decision.id} className="panel">
          <p><strong>{decision.decision_kind.replaceAll("_", " ")}</strong> · {decision.decision_state.replaceAll("_", " ")} · {new Date(decision.decided_at).toLocaleDateString("en-GB", { timeZone: "UTC" })} UTC</p>
          <DecisionReviewDownload recordId={run.id} decisionId={decision.id} />
        </div>)}
      </div>
    </section>}

    <div className="answer-stack canonical-record-stack">
      {answers.length ? answers.map((answer) => <RecommendationAnswerRecord
        key={answer.id}
        viewer={viewer}
        answer={answer}
        diagnostics={providerDiagnosticsByAnswer.get(answer.id)}
        sourceMap={sourceMap}
        organizationName={context?.organizationName || ""}
        reviewMode={run.status === "review"}
        demo={viewer.mode === "demo"}
        canInspectSources={canInspectSources}
        focusSourceId={focusSourceId}
        focusAnchorIndex={focusAnchor?.answerId === answer.id ? focusAnchor.index : undefined}
      />) : failure ? null : <section className="panel empty-state"><h2>{emptyState.title}</h2><p>{emptyState.body}</p></section>}
    </div>

    <section className="panel run-cost-breakdown">
      <details>
        <summary>Advanced run details</summary>
        <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Internal run economics</span><h2>{hasRecordedCost ? `${usd(totalCost)} persisted run cost` : "Cost not recorded"}</h2></div></div>
        <div className="run-cost-metrics"><div><span>Total cost</span><strong>{hasRecordedCost ? usd(totalCost) : "—"}</strong></div><div><span>Per question</span><strong>{hasRecordedCost && run.prompts ? usd(totalCost / run.prompts) : "—"}</strong></div><div><span>Per citation</span><strong>{hasRecordedCost && run.citations ? usd(totalCost / run.citations) : "—"}</strong></div><div><span>Tokens</span><strong>{costEventsComplete ? totalTokens?.toLocaleString() || "—" : "Withheld"}</strong></div></div>
        {!costEventsComplete ? <div className="empty-state empty-state--compact"><p>Attempt-level cost detail is withheld because the bounded ledger read reached its safety limit. The total above comes from the independently persisted run aggregate and is not recomputed from a truncated event subset.</p></div> : providerCosts.length ? <div className="run-cost-providers">{providerCosts.map((item) => <article key={`${item.provider}-${item.model}`}><div><strong>{item.provider}</strong><small>{item.model}</small></div><span>{item.events} cost event{item.events === 1 ? "" : "s"}</span><span>{item.tokens ? `${item.tokens.toLocaleString()} tokens` : "Tokens unavailable"}</span><span>{usd(item.cost)}</span><small>{Array.from(item.sources).join(" + ")} cost</small></article>)}</div> : <div className="empty-state empty-state--compact"><p>No attempt-level cost events were recorded. Foremention does not interpret missing cost as free usage.</p></div>}
      </details>
    </section>
  </main>;
}
