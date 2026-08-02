import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentControlPlane } from "@/components/agent-control-plane";
import { Arrow, StatusDot } from "@/components/brand";
import { demoCompany, engineCoverage } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth";
import { loadAgentControlPlane, loadDecisionSignal, loadPlacements, loadPrompts, loadProviderStatuses, loadRunAnswers, loadRuns, loadSourceEvidenceContexts, loadSourceMap, loadWorkspaceCompetitors, loadWorkspaceContext } from "@/lib/data";

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
  const observedRuns = runs.filter((run) => ["review", "complete", "partial"].includes(run.status));
  const reviewedRuns = runs.filter((run) => ["complete", "partial"].includes(run.status));
  const latest = observedRuns[0] || null;
  const [observedAnswers, sourceContexts, competitors] = await Promise.all([
    latest ? loadRunAnswers(viewer, latest.id) : Promise.resolve([]),
    loadSourceEvidenceContexts(viewer, sources.flatMap((source) => source.sourceId ? [source.sourceId] : [])),
    loadWorkspaceCompetitors(viewer),
  ]);
  const latestAnswer = observedAnswers[0];
  const appearedCompetitors = competitors.filter((name) => observedAnswers.some((answer) => answer.answer.toLocaleLowerCase().includes(name.toLocaleLowerCase())));
  const priorityGaps = sources.filter((source) => !source.clientPresent && source.competitors.length).slice(0, 3);
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
        <p>{context ? "Every metric below comes from persisted provider observations. Unreviewed results remain clearly labelled until a person approves them." : "Set up your company, category, competitors, and controlled buyer questions before collecting an answer."}</p>
      </div>
      <Link className="button button--ink" href={next.href}>{next.label} <Arrow /></Link>
    </div>

    <section className={`setup-rail ${setup.every((item) => item.done) ? "setup-rail--complete" : ""}`}>
      <div><span className="eyebrow">Workspace readiness</span><strong>{setup.filter((item) => item.done).length}/{setup.length} foundation steps complete</strong></div>
      {setup.every((item) => item.done) ? <div className="setup-complete"><strong>Foundation complete.</strong><span>Your workspace is collecting reviewed evidence. Continue with source review and a second comparable run.</span><Link href={next.href}>{next.label} <Arrow /></Link></div> : <ol>{setup.map((item, index) => <li className={item.done ? "is-complete" : ""} key={item.label}><Link href={item.href}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.done ? "Complete" : item.label === next.label ? "Next action" : "Pending"}</small></Link></li>)}</ol>}
    </section>

    <div className="metric-grid">
      <article><span>Observed brand presence</span><strong>{latest ? `${latest.presence}%` : "—"}</strong><small>{latest ? `Across ${latest.answers} real answers${latest.status === "review" ? " · awaiting review" : ""}` : "First audit has not completed"}</small></article>
      <article><span>Competitors appearing</span><strong>{latest ? appearedCompetitors.length : "—"}</strong><small>{appearedCompetitors.length ? appearedCompetitors.slice(0, 3).join(" · ") : latest ? "No configured competitor appeared" : "Waiting for collected answers"}</small></article>
      <article><span>Citation sources</span><strong>{latest ? sources.length : "—"}</strong><small>{latest ? `${latest.citations} returned citation observations` : "Waiting for returned citations"}</small></article>
      <article><span>Priority gaps</span><strong>{latest ? priorityGaps.length : "—"}</strong><small>{priorityGaps.length ? "Competitor-present pages where your brand was not found" : latest ? "No automatically observed page gaps yet" : "Created after the first audit"}</small></article>
    </div>

    <section className="weekly-loop-teaser">
      <div><span className="eyebrow">Weekly Intelligence Loop</span><strong>Search evidence. Compare runs. See change. Take one action.</strong><p>Foremention turns reviewed workspace records into an inspectable weekly decision brief with confidence and cost kept visible.</p></div>
      <Link className="button button--ink" href="/app/intelligence">Open Intelligence Loop <Arrow /></Link>
    </section>

    <AgentControlPlane plane={agents} compact />

    <section className="decision-teaser">
      <div><span className="eyebrow">Decision Lab</span><strong>{readiness}</strong><p>{decision.actions[0]?.reason}</p></div>
      <Link className="button button--ink" href="/app/decision-lab">Inspect reliability <Arrow /></Link>
    </section>

    <div className="dashboard-grid">
      <section className="panel panel--wide">
        <div className="panel-heading"><div><span className="eyebrow">{viewer.mode === "demo" ? "Engine coverage · fictional demo" : latest?.status === "review" ? "Latest observed answer · awaiting review" : "Latest verified answer"}</span><h2>{latestAnswer?.prompt || (viewer.mode === "demo" ? "Presence is uneven by engine." : "Coverage begins after the first audit.")}</h2></div><Link href={latest ? `/app/runs/${latest.id}` : "/app/runs"}>Inspect run &rarr;</Link></div>
        {latestAnswer ? <div className="latest-answer"><div><span>{latestAnswer.provider}{latestAnswer.model ? ` · ${latestAnswer.model}` : ""}</span><strong>{latestAnswer.citations.length} cited source{latestAnswer.citations.length === 1 ? "" : "s"} · {latestAnswer.collectedAt}{latest?.status === "review" ? " · unreviewed" : ""}</strong></div><p>{latestAnswer.answer.length > 520 ? `${latestAnswer.answer.slice(0, 519).trimEnd()}…` : latestAnswer.answer}</p></div> : viewer.mode === "demo" ? <div className="engine-list">{engineCoverage.map((row) => <div key={row.engine}><span>{row.engine}</span><div className="bar"><i style={{ width: `${row.presence}%` }} /></div><strong>{row.presence}%</strong><small>+{row.delta}</small></div>)}</div> : <div className="empty-state empty-state--compact"><p>{runs.some((run) => ["queued", "running"].includes(run.status)) ? "Your first audit is running now. Real provider answers will appear here automatically." : "A real provider answer will appear here after the first collection."}</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Evidence review queue</span><h2>{sources.filter((source) => source.crawlerAccess === "unknown").length} cited pages need verification.</h2></div></div>
        {sources.length ? <div className="compact-sources">{sources.slice(0, 4).map((source) => { const evidence = source.sourceId ? sourceContexts[source.sourceId]?.[0] : undefined; return <Link href={`/app/sources/${source.id}`} key={source.id}><span><StatusDot tone={source.crawlerAccess === "unknown" ? "gray" : source.clientPresent ? "green" : "red"} /><strong>{source.domain}</strong></span><small>{evidence ? `${evidence.provider} · citation ${evidence.citationOrdinal || "recorded"}` : source.crawlerAccess === "unknown" ? "Presence not reviewed" : source.route}</small></Link>; })}</div> : <div className="empty-state empty-state--compact"><p>No mapped sources yet.</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Top priority gaps</span><h2>{priorityGaps.length ? "Pages to inspect first." : "No evidence-backed gaps yet."}</h2></div></div>
        {priorityGaps.length ? <div className="compact-sources">{priorityGaps.map((source) => <Link href={`/app/sources/${source.id}`} key={source.id}><span><StatusDot tone="red" /><strong>{source.domain}</strong></span><small>{source.competitors.join(", ")} present · your brand absent</small></Link>)}</div> : <div className="empty-state empty-state--compact"><p>{latest ? "Foremention found citations, but none yet passed the automatic competitor-present and brand-absent check." : "Your first audit will create this list automatically."}</p></div>}
        <Link className="text-link" href="/app/opportunities">Open Priority Gaps <Arrow /></Link>
      </section>
    </div>
  </main>;
}
