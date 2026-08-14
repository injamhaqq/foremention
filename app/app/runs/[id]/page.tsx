import Link from "next/link";
import { notFound } from "next/navigation";
import { RunReview } from "@/components/run-review";
import { RunCancel } from "@/components/run-cancel";
import { RunRerunButton } from "@/components/run-rerun-button";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRunConfiguration, loadRunCostEvents, loadRuns, loadSourceMap, loadWorkspaceContext } from "@/lib/data";
import { extractBrandMentionContexts } from "@/lib/mention-context";
import { findSourceXrayTarget } from "@/lib/source-xray-link";

const usd = (value: number) => `$${value.toFixed(value < .01 ? 4 : 2)}`;

export default async function RunDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ first_evidence?: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const { first_evidence: firstEvidenceParam = "" } = await searchParams;
  const firstEvidence = firstEvidenceParam === "1";
  const [runs, answers, costEvents, configuration, context, sourceMap] = await Promise.all([loadRuns(viewer), loadRunAnswers(viewer, id), loadRunCostEvents(viewer, id), loadRunConfiguration(viewer, id), loadWorkspaceContext(viewer), loadSourceMap(viewer)]);
  const run = runs.find((item) => item.id === id);
  if (!run) notFound();
  const totalCost = costEvents.reduce((sum, event) => sum + event.costUsd, 0);
  const totalTokens = costEvents.some((event) => event.totalTokens !== null) ? costEvents.reduce((sum, event) => sum + Number(event.totalTokens || 0), 0) : null;
  const providerCosts = Array.from(costEvents.reduce((groups, event) => {
    const key = `${event.provider}\u0000${event.model}`;
    const current = groups.get(key) || { provider: event.provider, model: event.model, cost: 0, tokens: 0, events: 0, sources: new Set<string>() };
    current.cost += event.costUsd; current.tokens += Number(event.totalTokens || 0); current.events += 1; current.sources.add(event.costSource); groups.set(key, current); return groups;
  }, new Map<string, { provider: string; model: string; cost: number; tokens: number; events: number; sources: Set<string> }>()).values());
  const capacityFailure = run.status === "failed" && /capacity|ceiling|budget|quota|concurrent/i.test(run.errorSummary || "");
  const emptyState = run.status === "failed"
    ? { title: capacityFailure ? "This collection did not reach the AI system." : "The provider did not return evidence.", body: run.errorSummary || "This collection failed without creating answers or citations. Check the connected AI system and try again when it is available." }
    : run.status === "cancelled" ? { title: "This collection was cancelled.", body: "No answers or citations were added to the evidence trail." }
      : ["complete", "partial", "review"].includes(run.status) ? { title: "No usable answers were returned.", body: "The collection finished without evidence that can be reviewed or published." }
        : { title: "Answers have not arrived yet.", body: "The collection is queued, running, or waiting for a provider retry." };
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Collection {run.id.slice(0, 8).toUpperCase()}</span><h1>{run.status === "review" ? "Review AI results" : "AI Results"}</h1><p>{run.date} · {run.answers} answer{run.answers === 1 ? "" : "s"} · {run.citations} citation observation{run.citations === 1 ? "" : "s"}. Every result remains tied to this exact collection.</p></div><Link className="button button--outline" href="/app/runs">&larr; All AI Results</Link></div>
    {firstEvidence && <section className="panel"><span className="eyebrow">Your first real evidence</span><h2>Read the exact AI answer, then follow the source.</h2><p>{run.status === "review" ? "Review the recorded answer and every returned citation below. Approve the run only when they match what the AI system actually returned; that publishes the Source Map so you can inspect a cited page in Source X-Ray." : sourceMap.length ? "This reviewed collection is published. Open a mapped citation in Source X-Ray to compare the provider observation with the cited page, then complete the source review before acting on an opportunity." : "This collection is recorded. If no mapped source is available yet, keep the provider answer and citation as the evidence boundary rather than inventing a page-level conclusion."}</p><ol className="record-steps"><li>Read the exact buyer question and provider answer.</li><li>Check the provider-returned citation without changing it.</li><li>{run.status === "review" ? "Approve the run to publish its dated Source Map." : "Inspect a mapped citation in Source X-Ray when available."}</li><li>Keep crawler observations separate from human review before acting.</li></ol></section>}
    {run.status === "review" && <RunReview runId={run.id} />}
    {(run.status === "queued" || run.status === "running") && <RunCancel runId={run.id} />}
    {["complete", "partial"].includes(run.status) && configuration && <RunRerunButton promptIds={configuration.promptIds} provider={configuration.provider} demo={viewer.mode === "demo"} />}
    <div className="answer-stack">{answers.length ? answers.map((answer) => {
      const mentionContexts = extractBrandMentionContexts(answer.answer, context?.organizationName || "");
      return <article className="panel" key={answer.id}><header><div><span>AI system</span><strong>{answer.provider}</strong><small>{answer.model || "Recorded model"}</small></div><span className={`status-chip ${answer.status === "verified" ? "status-chip--active" : ""}`}>{answer.status}</span></header><h2>{answer.prompt}</h2><p>{answer.answer}</p>{mentionContexts.length > 0 && <section className="brand-mention-context"><span className="eyebrow">Brand mention context</span><h3>{mentionContexts.length} exact mention{mentionContexts.length === 1 ? "" : "s"}</h3>{mentionContexts.map((mention, index) => <article key={`${answer.id}-mention-${index}`}><strong>{mention.sentence}</strong><p>{mention.paragraph}</p></article>)}<small>Sentence and surrounding paragraph are extracted verbatim from this persisted provider answer.</small></section>}<div className="answer-citations"><strong>Sources returned by the AI system</strong>{answer.citations.length ? answer.citations.map((citation, index) => {
        const sourceTarget = run.status === "review" ? null : findSourceXrayTarget(citation.url, sourceMap);
        return <div key={`${citation.url}-${index}`}><a href={citation.url} target="_blank" rel="noreferrer">{citation.title || citation.url} &nearr;</a>{sourceTarget && <Link href={`/app/sources/${sourceTarget.id}`}>Inspect this citation in Source X-Ray &rarr;</Link>}</div>;
      }) : <span>No cited URLs returned</span>}</div><small>Collected {answer.collectedAt}</small></article>;
    }) : <section className="panel empty-state"><h2>{emptyState.title}</h2><p>{emptyState.body}</p></section>}</div>
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
