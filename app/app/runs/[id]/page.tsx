import Link from "next/link";
import { notFound } from "next/navigation";
import { RecommendationAnswerRecord } from "@/components/recommendation-answer-record";
import { RunReview } from "@/components/run-review";
import { RunCancel } from "@/components/run-cancel";
import { RunRerunButton } from "@/components/run-rerun-button";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadRunAnswers, loadRunConfiguration, loadRunCostEvents, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { loadProviderRunDiagnostics } from "@/lib/provider-run-diagnostics";

const usd = (value: number) => `$${value.toFixed(value < .01 ? 4 : 2)}`;

export default async function RunDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ first_evidence?: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const { first_evidence: firstEvidenceParam = "" } = await searchParams;
  const firstEvidence = firstEvidenceParam === "1";
  const [runs, answers, providerDiagnostics, costEvents, configuration, context, role] = await Promise.all([
    loadRuns(viewer),
    loadRunAnswers(viewer, id),
    loadProviderRunDiagnostics(viewer, id),
    loadRunCostEvents(viewer, id),
    loadRunConfiguration(viewer, id),
    loadWorkspaceContext(viewer),
    getPrimaryWorkspaceRole(viewer),
  ]);
  const run = runs.find((item) => item.id === id);
  if (!run) notFound();
  const sourceMap = ["complete", "partial"].includes(run.status) ? await loadTruthfulSourceMap(viewer, { runId: run.id }) : [];
  const canInspectSources = viewer.mode === "demo" || role === "owner" || role === "admin" || role === "analyst";
  const providerDiagnosticsByAnswer = new Map(providerDiagnostics.map((item) => [item.answerId, item]));
  const totalCost = costEvents.reduce((sum, event) => sum + event.costUsd, 0);
  const totalTokens = costEvents.some((event) => event.totalTokens !== null) ? costEvents.reduce((sum, event) => sum + Number(event.totalTokens || 0), 0) : null;
  const providerCosts = Array.from(costEvents.reduce((groups, event) => {
    const key = `${event.provider}\u0000${event.model}`;
    const current = groups.get(key) || { provider: event.provider, model: event.model, cost: 0, tokens: 0, events: 0, sources: new Set<string>() };
    current.cost += event.costUsd;
    current.tokens += Number(event.totalTokens || 0);
    current.events += 1;
    current.sources.add(event.costSource);
    groups.set(key, current);
    return groups;
  }, new Map<string, { provider: string; model: string; cost: number; tokens: number; events: number; sources: Set<string> }>()).values());
  const capacityFailure = run.status === "failed" && /capacity|ceiling|budget|quota|concurrent/i.test(run.errorSummary || "");
  const emptyState = run.status === "failed"
    ? { title: capacityFailure ? "This collection did not reach the AI system." : "The provider did not return evidence.", body: run.errorSummary || "This collection failed without creating answers or citations. Check the connected AI system and try again when it is available." }
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
    {["complete", "partial"].includes(run.status) && configuration && <RunRerunButton promptIds={configuration.promptIds} provider={configuration.provider} demo={viewer.mode === "demo"} />}

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
      />) : <section className="panel empty-state"><h2>{emptyState.title}</h2><p>{emptyState.body}</p></section>}
    </div>

    <section className="panel run-cost-breakdown">
      <details>
        <summary>Advanced run details</summary>
        <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Internal run economics</span><h2>{costEvents.length ? `${usd(totalCost)} recorded cost` : "Cost not recorded"}</h2></div></div>
        <div className="run-cost-metrics"><div><span>Total cost</span><strong>{costEvents.length ? usd(totalCost) : "—"}</strong></div><div><span>Per question</span><strong>{costEvents.length && run.prompts ? usd(totalCost / run.prompts) : "—"}</strong></div><div><span>Per citation</span><strong>{costEvents.length && run.citations ? usd(totalCost / run.citations) : "—"}</strong></div><div><span>Tokens</span><strong>{totalTokens?.toLocaleString() || "—"}</strong></div></div>
        {providerCosts.length ? <div className="run-cost-providers">{providerCosts.map((item) => <article key={`${item.provider}-${item.model}`}><div><strong>{item.provider}</strong><small>{item.model}</small></div><span>{item.events} question{item.events === 1 ? "" : "s"}</span><span>{item.tokens ? `${item.tokens.toLocaleString()} tokens` : "Tokens unavailable"}</span><span>{usd(item.cost)}</span><small>{Array.from(item.sources).join(" + ")} cost</small></article>)}</div> : <div className="empty-state empty-state--compact"><p>No attempt-level cost events were recorded. Foremention does not interpret missing cost as free usage.</p></div>}
      </details>
    </section>
  </main>;
}
