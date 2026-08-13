import Link from "next/link";
import { redirect } from "next/navigation";
import { Arrow, StatusDot } from "@/components/brand";
import { demoCompany } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { loadPlacements, loadPrompts, loadProviderStatuses, loadRunAnswers, loadRuns, loadSourceEvidenceContexts, loadSourceMap, loadWorkspaceCompetitors, loadWorkspaceContext } from "@/lib/data";
import { productStateLabel, stateForRun } from "@/lib/product-state";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

export default async function DashboardPage() {
  const viewer = await requireViewer("/app");
  const context = await loadWorkspaceContext(viewer).catch((error) => {
    console.error("Workspace context unavailable", error);
    return null;
  });
  if (viewer.mode === "supabase" && !context) redirect("/app/onboarding");

  const [prompts, runs, sources, placements, providers, intelligence] = await Promise.all([
    loadPrompts(viewer),
    loadRuns(viewer),
    loadSourceMap(viewer),
    loadPlacements(viewer),
    loadProviderStatuses(viewer),
    loadSafeWeeklyIntelligence(viewer),
  ]);
  const observedRuns = runs.filter((run) => ["review", "complete", "partial"].includes(run.status));
  const latest = observedRuns[0] || null;
  const comparableLatest = intelligence.latest;
  const comparablePrevious = intelligence.previous;
  const [observedAnswers, sourceContexts, competitors] = await Promise.all([
    latest ? loadRunAnswers(viewer, latest.id) : Promise.resolve([]),
    loadSourceEvidenceContexts(viewer, sources.flatMap((source) => source.sourceId ? [source.sourceId] : [])),
    loadWorkspaceCompetitors(viewer),
  ]);
  const latestAnswer = observedAnswers[0];
  const appearedCompetitors = competitors.filter((name) => observedAnswers.some((answer) => answer.answer.toLocaleLowerCase().includes(name.toLocaleLowerCase())));
  const reviewedOpportunities = sources.filter((source) => !source.clientPresent && source.crawlerAccess !== "unknown" && source.route !== "unknown" && source.influence !== "unknown" && source.feasibility !== "unknown");
  const pendingOrFailedRun = !latest ? runs.find((run) => ["queued", "running", "failed"].includes(run.status)) : null;
  const firstReviewedSource = sources.find((source) => Boolean(source.reviewedAt));
  const firstObservedRun = runs.find((run) => run.answers > 0);
  const activation = [
    { label: "Add your website", detail: "Tell Foremention which company and category this workspace measures.", done: Boolean(context?.website), href: "/app/onboarding" },
    { label: "Review buyer questions", detail: "Approve the questions real buyers might ask an AI system.", done: prompts.some((prompt) => prompt.approved), href: "/app/prompts" },
    { label: "Start your first collection", detail: providers.some((provider) => provider.configured) ? "Collect the approved questions with one monitored AI system." : "A monitoring connection must be available before collection can start.", done: runs.length > 0, href: providers.some((provider) => provider.configured) ? "/app/runs" : "/app/settings#providers" },
    { label: "See your first AI result", detail: "Read the persisted answer and any URLs the AI system actually returned.", done: Boolean(firstObservedRun), href: firstObservedRun ? `/app/runs/${firstObservedRun.id}` : "/app/runs" },
    { label: "Review your first source", detail: "Check one cited page before treating it as evidence for an opportunity.", done: Boolean(firstReviewedSource), href: firstReviewedSource ? `/app/sources/${firstReviewedSource.id}` : "/app/source-map" },
  ];
  const next = activation.find((item) => !item.done) || { label: reviewedOpportunities.length ? "Choose an opportunity" : "Review your Sources", href: reviewedOpportunities.length ? "/app/opportunities" : "/app/source-map" };
  const state = latest ? stateForRun({ status: latest.status, answerCount: latest.answers, citationCount: latest.citations }) : pendingOrFailedRun ? stateForRun({ status: pendingOrFailedRun.status, answerCount: pendingOrFailedRun.answers, citationCount: pendingOrFailedRun.citations }) : "READY_TO_COLLECT";
  const exactMovement = comparableLatest && comparablePrevious
    ? {
      delta: comparableLatest.presence - comparablePrevious.presence,
      latest: comparableLatest,
      previous: comparablePrevious,
    }
    : null;

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">{viewer.mode === "demo" ? demoCompany.category : context?.category || "Customer workspace"}</span>
        <h1>{latest ? "What changed in your AI evidence?" : "Build your first trustworthy baseline."}</h1>
        <p>{viewer.mode === "demo" ? "Every metric below comes from fictional sample observations and fictional sample answers created only for this isolated demo." : latest ? "Start with the latest observed answer, the cited pages behind it, and the next reviewed opportunity. Unreviewed evidence stays clearly labelled." : "Five clear steps take you from your website to a reviewed cited source. No fake metrics appear while Foremention is waiting for real observations."}</p>
        <p className="table-caption"><strong>{productStateLabel(state)}</strong>{latest ? ` · Last collected ${latest.date} · ${latest.answers} recorded answer${latest.answers === 1 ? "" : "s"}` : ""}</p>
      </div>
      <Link className="button button--ink" href={next.href}>{next.label} <Arrow /></Link>
    </div>

    {pendingOrFailedRun && <section className="inline-notice" role={pendingOrFailedRun.status === "failed" ? "alert" : "status"}><strong>{pendingOrFailedRun.status === "failed" ? "The latest collection needs another try." : "Collecting AI answers now."}</strong><p>{pendingOrFailedRun.status === "failed" ? "Your audit is taking longer than expected or ended before usable evidence was ready. No fake metrics were added. Saved workspace data remains intact; open the collection to inspect the failure and retry safely." : "Foremention is collecting AI answers, preserving returned citations, and preparing evidence. You can leave this page and return later."}</p><Link href={`/app/runs/${pendingOrFailedRun.id}`}>Open collection status <Arrow /></Link></section>}

    {!activation.every((item) => item.done) ? <section className="getting-started" aria-labelledby="getting-started-title">
      <div className="getting-started__heading"><div><span className="eyebrow">Workspace readiness</span><h2 id="getting-started-title">Five steps to useful evidence.</h2></div><strong>{activation.filter((item) => item.done).length}/{activation.length} complete</strong></div>
      <ol>{activation.map((item) => <li className={item.done ? "is-complete" : item.label === next.label ? "is-next" : ""} key={item.label}><Link href={item.href}><span className="getting-started__check" aria-hidden="true">{item.done ? "✓" : ""}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><Arrow /></Link></li>)}</ol>
    </section> : <section className="setup-complete"><strong>First-use setup complete.</strong><span>Your workspace now has a reviewed evidence baseline. Continue with comparable collections, opportunities, and actions.</span><Link href={next.href}>{next.label} <Arrow /></Link></section>}

    <div className="metric-grid">
      <article><span>Observed brand presence</span><strong>{latest ? `${latest.presence}%` : "—"}</strong><small>{latest ? `Across ${latest.answers} recorded answer${latest.answers === 1 ? "" : "s"}${latest.status === "review" ? " · awaiting review" : ""}` : "First audit has not completed"}</small></article>
      <article><span>Configured competitors appearing</span><strong>{latest ? appearedCompetitors.length : "—"}</strong><small>{appearedCompetitors.length ? appearedCompetitors.slice(0, 3).join(" · ") : latest ? "No configured competitor appeared in this answer set" : "Waiting for collected answers"}</small></article>
      <article><span>Cited sources</span><strong>{latest ? sources.length : "—"}</strong><small>{latest ? `${latest.citations} returned citation observation${latest.citations === 1 ? "" : "s"}` : "Waiting for returned citations"}</small></article>
      <article><span>Reviewed opportunities</span><strong>{latest ? reviewedOpportunities.length : "—"}</strong><small>{reviewedOpportunities.length ? "Human-checked cited pages with a recorded route" : latest ? "No reviewed opportunity exists yet" : "Created only after source review"}</small></article>
    </div>

    <section className="weekly-loop-teaser">
      <div><span className="eyebrow">What changed?</span><strong>{exactMovement ? `Brand presence ${exactMovement.delta === 0 ? "held steady" : exactMovement.delta > 0 ? "increased" : "decreased"} by ${Math.abs(exactMovement.delta)} points.` : comparableLatest ? "This is the current exact reviewed baseline. Cross-collection movement is withheld until an identical comparison exists." : latest ? "This collection is observed evidence, but it is not yet an exact reviewed comparison baseline." : "A comparable change needs at least one completed collection."}</strong><p>{exactMovement ? `Current: ${exactMovement.latest.presence}% across ${exactMovement.latest.answers} verified answers and ${exactMovement.latest.citations} citation observations. Comparable prior: ${exactMovement.previous.presence}% across ${exactMovement.previous.answers} verified answers and ${exactMovement.previous.citations} citation observations. The persisted buyer-question text, provider, exact model, and methodology matched. Foremention records the change; it does not claim what caused it.` : comparableLatest ? "Other reviewed collections can remain valid evidence on their own. Foremention reports movement here only when the persisted buyer-question text, provider, exact model, and methodology all match the current reviewed baseline." : "Repeat the exact approved questions with the same provider, exact model, and methodology after review before interpreting movement."}</p><Link className="text-link" href="/app/intelligence">Advanced: Weekly Intelligence Loop <Arrow /></Link></div>
      <Link className="button button--ink" href="/app/analytics">Open Analytics <Arrow /></Link>
    </section>

    <div className="dashboard-grid">
      <section className="panel panel--wide">
        <div className="panel-heading"><div><span className="eyebrow">{latest?.status === "review" ? "Latest observed answer · awaiting review" : "Latest verified answer"}</span><h2>{latestAnswer?.prompt || "AI Results appear after the first collection."}</h2></div><Link href={latest ? `/app/runs/${latest.id}` : "/app/runs"}>Open AI Results &rarr;</Link></div>
        {latestAnswer ? <div className="latest-answer"><div><span>{latestAnswer.provider}{latestAnswer.model ? ` · ${latestAnswer.model}` : ""}</span><strong>{latestAnswer.citations.length} cited source{latestAnswer.citations.length === 1 ? "" : "s"} · {latestAnswer.collectedAt}{latest?.status === "review" ? " · awaiting review" : ""}</strong></div><p>{latestAnswer.answer.length > 520 ? `${latestAnswer.answer.slice(0, 519).trimEnd()}…` : latestAnswer.answer}</p></div> : <div className="empty-state empty-state--compact"><p>{runs.some((run) => ["queued", "running"].includes(run.status)) ? "Your first collection is running now. Real AI answers will appear here automatically." : "A real AI answer will appear here after the first collection."}</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Why?</span><h2>{sources.filter((source) => source.crawlerAccess === "unknown").length} cited page{sources.filter((source) => source.crawlerAccess === "unknown").length === 1 ? "" : "s"} need review.</h2></div></div>
        {sources.length ? <div className="compact-sources">{sources.slice(0, 4).map((source) => { const evidence = source.sourceId ? sourceContexts[source.sourceId]?.[0] : undefined; return <Link href={`/app/sources/${source.id}`} key={source.id}><span><StatusDot tone={source.crawlerAccess === "unknown" ? "gray" : source.clientPresent ? "green" : "red"} /><strong>{source.domain}</strong></span><small>{evidence ? `${evidence.provider} · citation ${evidence.citationOrdinal || "recorded"}` : source.crawlerAccess === "unknown" ? "Presence not reviewed" : source.route}</small></Link>; })}</div> : <div className="empty-state empty-state--compact"><p>No mapped sources yet. Sources appear only from real returned citations.</p></div>}
        <Link className="text-link" href="/app/source-map">Open Sources <Arrow /></Link>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">What should I do?</span><h2>{reviewedOpportunities.length ? `${reviewedOpportunities.length} reviewed opportunit${reviewedOpportunities.length === 1 ? "y is" : "ies are"} ready.` : "No reviewed opportunity yet."}</h2></div></div>
        {reviewedOpportunities.length ? <div className="compact-sources">{reviewedOpportunities.slice(0, 3).map((source) => <Link href="/app/opportunities" key={source.id}><span><StatusDot tone="red" /><strong>{source.domain}</strong></span><small>{source.evidenceCount} citation observation{source.evidenceCount === 1 ? "" : "s"} · {source.route}</small></Link>)}</div> : <div className="empty-state empty-state--compact"><p>{sources.length ? "Review cited pages first. Foremention will not call an unreviewed page an opportunity." : "Your first cited pages will create the evidence review queue."}</p></div>}
        <Link className="text-link" href="/app/opportunities">Open Opportunities <Arrow /></Link>
      </section>
    </div>

    {placements.length > 0 && <section className="evidence-note"><strong>After you act</strong><p>{placements.length} action{placements.length === 1 ? " is" : "s are"} being tracked. Comparable remeasurement can record what changed afterward without claiming the action caused the change. <Link href="/app/placements">Open Actions →</Link></p></section>}
  </main>;
}
