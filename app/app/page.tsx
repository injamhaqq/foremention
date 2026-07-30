import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentControlPlane } from "@/components/agent-control-plane";
import { Arrow, StatusDot } from "@/components/brand";
import { demoCompany, engineCoverage } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { loadAgentControlPlane, loadDecisionSignal, loadLatestReviewedAnswers, loadPlacements, loadPrompts, loadProviderStatuses, loadRuns, loadSourceEvidenceContexts, loadSourceMap, loadWorkspaceContext } from "@/lib/data";

export default async function DashboardPage() {
  const viewer = await requireViewer("/app");
  const context = await loadWorkspaceContext(viewer).catch((error) => {
    console.error("Workspace context unavailable", error);
    return null;
  });

  // A confirmed customer without an organization has nothing useful to load
  // on the dashboard yet. Send them directly to the first product step instead
  // of issuing five empty workspace queries and presenting a stalled sign-in.
  if (viewer.mode === "supabase" && !context) redirect("/app/onboarding");

  const [prompts, runs, sources, placements, decision, providers, agents] = await Promise.all([
    loadPrompts(viewer),
    loadRuns(viewer),
    loadSourceMap(viewer),
    loadPlacements(viewer),
    loadDecisionSignal(viewer),
    loadProviderStatuses(viewer),
    loadAgentControlPlane(viewer),
  ]);
  const reviewedRuns = runs.filter((run) => run.status === "complete");
  const latest = reviewedRuns[0] || { presence: 0, firstMention: 0, answers: 0 };
  const [reviewedAnswers, sourceContexts] = await Promise.all([
    loadLatestReviewedAnswers(viewer, 1),
    loadSourceEvidenceContexts(viewer, sources.flatMap((source) => source.sourceId ? [source.sourceId] : [])),
  ]);
  const latestAnswer = reviewedAnswers[0];
  const published = placements.filter((placement) => ["published", "indexed", "first cited", "repeatedly cited"].includes(placement.stage)).length;
  const setup = [
    { label: "Create workspace", done: Boolean(context), href: "/app/onboarding" },
    { label: "Approve buyer questions", done: prompts.some((prompt) => prompt.approved), href: "/app/prompts" },
    { label: "Connect a provider", done: viewer.mode === "demo" || providers.some((provider) => provider.configured), href: "/app/settings#providers" },
    { label: "Collect answers", done: runs.length > 0, href: "/app/runs" },
    { label: "Inspect agent execution", done: Boolean(agents.latestRunId), href: "/app/agents" },
    { label: "Review evidence", done: reviewedRuns.length > 0, href: runs.find((run) => run.status === "review") ? `/app/runs/${runs.find((run) => run.status === "review")!.id}` : "/app/runs" },
    { label: "Publish Source Map", done: sources.length > 0 && reviewedRuns.length > 0, href: "/app/source-map" },
  ];
  const next = setup.find((item) => !item.done) || { label: placements.length ? "Update tracked actions" : "Choose a priority gap", href: placements.length ? "/app/placements" : "/app/opportunities" };
  const readiness = decision.decisionReadiness === "ready" ? "Evidence is decision-ready." : decision.decisionReadiness === "directional" ? "Treat this signal as directional." : "More evidence is required.";

  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">{viewer.mode === "demo" ? demoCompany.category : context?.category || "New customer workspace"}</span>
        <h1>{context ? "Your recommendation workspace." : "Start with the evidence boundary."}</h1>
        <p>{context ? "Every metric below comes from reviewed workspace records. Unreviewed collection stays visible but excluded." : "Set up your company, category, competitors, and controlled buyer questions before collecting an answer."}</p>
      </div>
      <Link className="button button--ink" href={next.href}>{next.label} <Arrow /></Link>
    </div>

    <section className={`setup-rail ${setup.every((item) => item.done) ? "setup-rail--complete" : ""}`}>
      <div><span className="eyebrow">Workspace readiness</span><strong>{setup.filter((item) => item.done).length}/{setup.length} foundation steps complete</strong></div>
      {setup.every((item) => item.done) ? <div className="setup-complete"><strong>Foundation complete.</strong><span>Your workspace is collecting reviewed evidence. Continue with source review and a second comparable run.</span><Link href={next.href}>{next.label} <Arrow /></Link></div> : <ol>{setup.map((item, index) => <li className={item.done ? "is-complete" : ""} key={item.label}><Link href={item.href}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.done ? "Complete" : item.label === next.label ? "Next action" : "Pending"}</small></Link></li>)}</ol>}
    </section>

    <div className="metric-grid">
      <article><span>Reviewed brand presence</span><strong>{latest.presence}%</strong><small>{reviewedRuns.length ? `Across ${latest.answers} answers` : "No approved runs"}</small></article>
      <article><span>First-mention share</span><strong>{latest.firstMention}%</strong><small>{reviewedRuns.length ? "Latest approved run" : "No approved runs"}</small></article>
      <article><span>Mapped sources</span><strong>{sources.length}</strong><small>{sources.filter((source) => source.crawlerAccess !== "unknown").length} page reviews complete</small></article>
      <article><span>Tracked actions</span><strong>{placements.length}</strong><small>{published} published or beyond</small></article>
    </div>

    <AgentControlPlane plane={agents} compact />

    <section className="decision-teaser">
      <div><span className="eyebrow">Decision Lab</span><strong>{readiness}</strong><p>{decision.actions[0]?.reason}</p></div>
      <Link className="button button--ink" href="/app/decision-lab">Inspect reliability <Arrow /></Link>
    </section>

    <div className="dashboard-grid">
      <section className="panel panel--wide">
        <div className="panel-heading"><div><span className="eyebrow">{viewer.mode === "demo" ? "Engine coverage · fictional demo" : "Latest verified answer"}</span><h2>{latestAnswer?.prompt || (viewer.mode === "demo" ? "Presence is uneven by engine." : "Coverage begins after the first approved run.")}</h2></div><Link href={reviewedRuns[0] ? `/app/runs/${reviewedRuns[0].id}` : "/app/runs"}>Inspect run &rarr;</Link></div>
        {latestAnswer ? <div className="latest-answer"><div><span>{latestAnswer.provider}{latestAnswer.model ? ` · ${latestAnswer.model}` : ""}</span><strong>{latestAnswer.citations.length} cited source{latestAnswer.citations.length === 1 ? "" : "s"} · {latestAnswer.collectedAt}</strong></div><p>{latestAnswer.answer.length > 520 ? `${latestAnswer.answer.slice(0, 519).trimEnd()}…` : latestAnswer.answer}</p></div> : viewer.mode === "demo" ? <div className="engine-list">{engineCoverage.map((row) => <div key={row.engine}><span>{row.engine}</span><div className="bar"><i style={{ width: `${row.presence}%` }} /></div><strong>{row.presence}%</strong><small>+{row.delta}</small></div>)}</div> : <div className="empty-state empty-state--compact"><p>{runs.some((run) => run.status === "review") ? "A collection is waiting for human review before its answer enters the workspace." : "A real provider answer will appear here after collection and human review."}</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Evidence review queue</span><h2>{sources.filter((source) => source.crawlerAccess === "unknown").length} cited pages need verification.</h2></div></div>
        {sources.length ? <div className="compact-sources">{sources.slice(0, 4).map((source) => { const evidence = source.sourceId ? sourceContexts[source.sourceId]?.[0] : undefined; return <Link href={`/app/sources/${source.id}`} key={source.id}><span><StatusDot tone={source.crawlerAccess === "unknown" ? "gray" : source.clientPresent ? "green" : "red"} /><strong>{source.domain}</strong></span><small>{evidence ? `${evidence.provider} · citation ${evidence.citationOrdinal || "recorded"}` : source.crawlerAccess === "unknown" ? "Presence not reviewed" : source.route}</small></Link>; })}</div> : <div className="empty-state empty-state--compact"><p>No mapped sources yet.</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Pipeline</span><h2>Action state, not promises.</h2></div></div>
        <div className="stage-summary">{["identified", "pitched", "published", "first cited"].map((stage) => <div key={stage}><strong>{placements.filter((placement) => placement.stage === stage).length}</strong><span>{stage}</span></div>)}</div>
        <Link className="text-link" href="/app/placements">Open the Action Tracker <Arrow /></Link>
      </section>
    </div>
  </main>;
}
