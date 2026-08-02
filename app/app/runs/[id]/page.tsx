import Link from "next/link";
import { notFound } from "next/navigation";
import { RunReview } from "@/components/run-review";
import { RunCancel } from "@/components/run-cancel";
import { RunRerunButton } from "@/components/run-rerun-button";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRunConfiguration, loadRunCostEvents, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { extractBrandMentionContexts } from "@/lib/mention-context";

const usd = (value: number) => `$${value.toFixed(value < .01 ? 4 : 2)}`;

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/runs");
  const { id } = await params;
  const [runs, answers, costEvents, configuration, context] = await Promise.all([loadRuns(viewer), loadRunAnswers(viewer, id), loadRunCostEvents(viewer, id), loadRunConfiguration(viewer, id), loadWorkspaceContext(viewer)]);
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
    ? { title: capacityFailure ? "This run did not reach the provider." : "The provider did not return evidence.", body: run.errorSummary || "This run failed without creating answers or citations. Check the connected provider and try again when it is available." }
    : run.status === "cancelled" ? { title: "This collection was cancelled.", body: "No answers or citations were added to the evidence trail." }
      : ["complete", "partial", "review"].includes(run.status) ? { title: "No usable answers were returned.", body: "The run finished without evidence that can be reviewed or published." }
        : { title: "Answers have not arrived yet.", body: "The run is queued, running, or waiting for a provider retry." };
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Run {run.id.slice(0, 8).toUpperCase()}</span><h1>{run.status === "review" ? "Review collected evidence." : "Collected evidence"}</h1><p>{run.date} · {run.answers} answers · {run.citations} citation observations. Metrics remain tied to this exact run.</p></div><Link className="button button--outline" href="/app/runs">← All runs</Link></div>
    {run.status === "review" && <RunReview runId={run.id} />}
    {(run.status === "queued" || run.status === "running") && <RunCancel runId={run.id} />}
    {["complete", "partial"].includes(run.status) && configuration && <RunRerunButton promptIds={configuration.promptIds} provider={configuration.provider} demo={viewer.mode === "demo"} />}
    <section className="panel panel--flush run-cost-breakdown"><div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Run cost trace</span><h2>{costEvents.length ? `${usd(totalCost)} recorded cost` : "Cost not recorded"}</h2></div></div><div className="run-cost-metrics"><div><span>Total cost</span><strong>{costEvents.length ? usd(totalCost) : "—"}</strong></div><div><span>Per question</span><strong>{costEvents.length && run.prompts ? usd(totalCost / run.prompts) : "—"}</strong></div><div><span>Per citation</span><strong>{costEvents.length && run.citations ? usd(totalCost / run.citations) : "—"}</strong></div><div><span>Tokens</span><strong>{totalTokens?.toLocaleString() || "—"}</strong></div></div>{providerCosts.length ? <div className="run-cost-providers">{providerCosts.map((item) => <article key={`${item.provider}-${item.model}`}><div><strong>{item.provider}</strong><small>{item.model}</small></div><span>{item.events} question{item.events === 1 ? "" : "s"}</span><span>{item.tokens ? `${item.tokens.toLocaleString()} tokens` : "Tokens unavailable"}</span><span>{usd(item.cost)}</span><small>{Array.from(item.sources).join(" + ")} cost</small></article>)}</div> : <div className="empty-state empty-state--compact"><p>No attempt-level cost events were recorded. Foremention does not interpret missing cost as free usage.</p></div>}</section>
    <div className="answer-stack">{answers.length ? answers.map((answer) => {
      const mentionContexts = extractBrandMentionContexts(answer.answer, context?.organizationName || "");
      return <article className="panel" key={answer.id}><header><div><span>{answer.provider}</span><strong>{answer.model || "Recorded model"}</strong></div><span className={`status-chip ${answer.status === "verified" ? "status-chip--active" : ""}`}>{answer.status}</span></header><h2>{answer.prompt}</h2><p>{answer.answer}</p>{mentionContexts.length > 0 && <section className="brand-mention-context"><span className="eyebrow">Brand mention context</span><h3>{mentionContexts.length} exact mention{mentionContexts.length === 1 ? "" : "s"}</h3>{mentionContexts.map((mention, index) => <article key={`${answer.id}-mention-${index}`}><strong>{mention.sentence}</strong><p>{mention.paragraph}</p></article>)}<small>Sentence and surrounding paragraph are extracted verbatim from this persisted provider answer.</small></section>}<div className="answer-citations"><strong>Cited URLs</strong>{answer.citations.length ? answer.citations.map((citation) => <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>{citation.title || citation.url} ↗</a>) : <span>No cited URLs returned</span>}</div><small>Collected {answer.collectedAt}</small></article>;
    }) : <section className="panel empty-state"><h2>{emptyState.title}</h2><p>{emptyState.body}</p></section>}</div>
  </main>;
}
