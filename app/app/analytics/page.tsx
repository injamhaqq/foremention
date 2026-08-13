import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { buildComparableObservationEvents } from "@/lib/comparable-observation-events";
import { loadSourceChangeGraph } from "@/lib/change-graph";
import { loadQuestionPerformance, loadRunAnswers, loadRuns, loadSourceMap } from "@/lib/data";
import { productStateLabel, stateForRun } from "@/lib/product-state";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

// Legacy contract wording retained in source only: loadWeeklyIntelligence; "same question set, provider, exact model, and methodology";
// "Other reviewed collections exist, but none matched". Customer-facing copy now requires exact persisted question text as a stricter boundary.
const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
const snapshotDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
}).format(new Date(value));
const sourceHost = (value: string) => {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value; }
};
const observationKind = (kind: string) => ({
  brand_presence: "Brand presence",
  citation: "Citation observations",
  source: "Unique cited sources",
  answer: "AI answer text",
}[kind] || "AI observation");

export default async function AnalyticsPage() {
  const viewer = await requireViewer("/app/analytics");
  const [allRuns, sources, questions, intelligence] = await Promise.all([
    loadRuns(viewer),
    loadSourceMap(viewer),
    loadQuestionPerformance(viewer),
    loadSafeWeeklyIntelligence(viewer),
  ]);
  const observedRuns = allRuns.filter((run) => ["review", "complete", "partial"].includes(run.status));
  const latest = intelligence.latest;
  const previous = intelligence.previous;

  if (!latest) {
    const pendingOrFailed = allRuns.find((run) => ["queued", "running", "review", "failed"].includes(run.status));
    const state = stateForRun(pendingOrFailed ? { status: pendingOrFailed.status, answerCount: pendingOrFailed.answers, citationCount: pendingOrFailed.citations } : null);
    const waitingForReview = pendingOrFailed?.status === "review";
    return <main className="workspace" data-product-state={state}><div className="workspace-heading"><div><span className="eyebrow">Did anything change?</span><h1>Analytics</h1><p>Analytics begin only after persisted provider observations pass the human-review boundary. Foremention will never substitute demo values for customer data.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong></p></div></div><section className="panel empty-state empty-state--border"><h2>{pendingOrFailed?.status === "failed" ? "The latest collection needs another try." : waitingForReview ? "Your first collection is waiting for review." : pendingOrFailed ? "Your first collection is still running." : "No reviewed baseline exists yet."}</h2><p>{pendingOrFailed?.status === "failed" ? "Your audit is taking longer than expected or ended before a reviewed baseline was ready. No zero-value placeholder is being presented as a result. Inspect the failed collection and retry when the AI system is available." : waitingForReview ? "Review or exclude the persisted answers before they enter customer-facing trend analytics." : pendingOrFailed ? "This page will populate automatically when real answers and citations arrive and pass review." : "Start the first connected AI collection. Foremention will never substitute demo values for customer data."}</p><Link className="button button--ink" href={pendingOrFailed ? `/app/runs/${pendingOrFailed.id}` : "/app/runs"}>Open AI Results →</Link></section></main>;
  }

  const sourceIds = sources.flatMap((source) => source.sourceId ? [source.sourceId] : []);
  const [answers, previousAnswers, changeGraph] = await Promise.all([
    loadRunAnswers(viewer, latest.id),
    previous ? loadRunAnswers(viewer, previous.id) : [],
    loadSourceChangeGraph(viewer, sourceIds),
  ]);
  const observationEvents = intelligence.telemetry === "recorded"
    ? buildComparableObservationEvents({ latest, previous, latestAnswers: answers, previousAnswers })
    : [];
  const sourceEntryById = new Map(sources.flatMap((source) => source.sourceId ? [[source.sourceId, source.id] as const] : []));
  const recurringSources = sources.filter((source) => source.evidenceCount > 1).length;
  const reviewedSourceCount = sources.filter((source) => source.crawlerAccess !== "unknown").length;
  const recentRuns = observedRuns.slice(0, 8);
  const reviewedRunCount = observedRuns.filter((run) => ["complete", "partial"].includes(run.status)).length;
  const newestRun = allRuns[0] || null;
  const state = newestRun && ["queued", "running"].includes(newestRun.status)
    ? "COLLECTING"
    : newestRun?.status === "review"
      ? "NEEDS_REVIEW"
      : previous
        ? "COMPLETE"
        : "PARTIALLY_COMPLETE";
  const comparisonWindowNote = previous
    ? `Comparable prior collection ${previous.date}`
    : reviewedRunCount > 1
      ? "Other reviewed collections exist, but no exact comparison pair is currently available for the latest baseline"
      : "A second exactly comparable reviewed collection is required before Foremention reports movement";

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading"><div><span className="eyebrow">Did anything change?</span><h1>Analytics</h1><p>Compare reviewed collections, question evidence yield, source-review progress, AI-observation changes, and saved cited-page changes. Trend deltas appear only when Foremention finds the same exact persisted buyer-question text, provider, exact model, and methodology. Movement is observed change, not proof that an action caused it.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong> · Current reviewed baseline {latest.date} · {latest.answers} answer{latest.answers === 1 ? "" : "s"} · {comparisonWindowNote}</p></div><Link className="button button--outline" href="/app/runs">Inspect AI Results</Link></div>

    <div className="metric-grid"><article><span>Brand presence</span><strong>{latest.presence}%</strong><small>{latest.answers} verified answer{latest.answers === 1 ? "" : "s"}{previous ? ` · ${signed(latest.presence - previous.presence)} pts vs comparable prior` : " · reviewed baseline only"}</small></article><article><span>First mention</span><strong>{latest.firstMention}%</strong><small>{latest.answers} verified answer{latest.answers === 1 ? "" : "s"}{previous ? ` · ${signed(latest.firstMention - previous.firstMention)} pts vs comparable prior` : " · reviewed baseline only"}</small></article><article><span>Citation observations</span><strong>{latest.citations}</strong><small>{previous ? `${signed(latest.citations - previous.citations)} vs comparable prior` : `${recurringSources} recurring mapped sources · no trend delta yet`}</small></article><article><span>Reviewed sources</span><strong>{reviewedSourceCount} of {sources.length}</strong><small>{sources.length - reviewedSourceCount} cited page{sources.length - reviewedSourceCount === 1 ? "" : "s"} still need review</small></article></div>

    <section className="panel panel--flush ai-observation-events">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Change Graph · AI observations</span><h2>{intelligence.telemetry === "fictional" ? "Fictional demo movement is not presented as customer evidence." : previous ? observationEvents.length ? `${observationEvents.length} supported change event${observationEvents.length === 1 ? "" : "s"} in the exact comparison pair.` : "No supported AI-observation differences in the exact comparison pair." : "One reviewed collection establishes the AI baseline."}</h2><p>{intelligence.telemetry === "fictional" ? "Use a real workspace collection for evidence-backed change events." : previous ? "Foremention first verifies the prior run through the safe exact-question comparison gate. Only then does this layer explain supported differences in brand presence, returned citations, unique cited sources, and exact answer text." : "A second reviewed collection with the same exact persisted buyer-question text, provider, exact model, and methodology is required before Foremention reports AI-observation movement."}</p></div>{previous && <Link className="text-link" href={`/app/runs/${latest.id}`}>Inspect current AI Results →</Link>}</div>
      {observationEvents.length ? <div className="notification-list">{observationEvents.map((event) => <article key={event.id}><div><span>{observationKind(event.kind)} · {event.direction}</span><strong>{event.title}</strong><p>{event.detail}</p></div><Link href={event.href}>Inspect →</Link></article>)}</div> : <div className="empty-state empty-state--border"><h2>{previous ? "Nothing is promoted into an AI change event without a supported difference." : "No comparable AI movement yet."}</h2><p>{previous ? "The selected exact comparison pair matched across the supported observation types, or only unsupported differences occurred." : "Other reviewed collections can remain valid evidence on their own even when they do not qualify as an exact comparable prior run."}</p></div>}
      <p className="table-caption panel-heading--padded">AI-observation events are descriptive evidence only. They do not prove ranking impact, demand, traffic, leads, revenue, publisher acceptance, or causation. Provider cost and token economics are intentionally excluded from this customer layer.</p>
    </section>

    <div className="analytics-grid"><section className="panel panel--wide"><span className="eyebrow">Comparable brand presence</span><h2>{previous ? "Exact comparison pair" : "One comparable baseline so far"}</h2>{previous ? <div className="trend-chart trend-chart--dynamic" style={{ gridTemplateColumns: "repeat(2, minmax(80px, 1fr))" }} role="img" aria-label="Brand presence across the comparable prior and current reviewed collections"><div><i style={{ height: `${Math.max(2, previous.presence)}%` }} /><span>Prior</span><small>{previous.presence}%</small></div><div><i style={{ height: `${Math.max(2, latest.presence)}%` }} /><span>Current</span><small>{latest.presence}%</small></div></div> : <div className="baseline-record"><strong>{answers[0]?.provider}{answers[0]?.model ? ` · ${answers[0].model}` : ""}</strong><p>{answers[0] ? `${answers[0].citations.length} cited source${answers[0].citations.length === 1 ? "" : "s"} were preserved from this verified answer. Foremention will not compare this baseline with a run that changed the exact buyer-question text, provider, exact model, or methodology.` : "The reviewed run establishes a baseline. A second exactly comparable collection is required before Foremention draws a trend."}</p></div>}<p className="table-caption">Only the exact comparable pair above is used for movement. Other reviewed collections remain inspectable below but are not silently mixed into the trend.</p></section><section className="panel"><span className="eyebrow">Source review progress</span><h2>{reviewedSourceCount} of {sources.length} pages checked.</h2><div className="empty-state empty-state--compact"><p>{sources.length ? `${sources.length - reviewedSourceCount} cited pages still need page-level verification before they become reviewed opportunities.` : "No cited sources are available yet."}</p><Link className="text-link" href="/app/source-map">Review Sources →</Link></div></section></div>

    <section className="panel panel--flush source-change-graph">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Source Change Graph · cited page observations</span><h2>Which cited pages actually changed?</h2><p>Foremention compares immutable bounded page observations from collections and manual source checks. It records fingerprint and reachability differences without storing page bodies or claiming why a page changed.</p><p className="table-caption"><strong>{changeGraph.checkedCount ? `${changeGraph.checkedCount} saved page check${changeGraph.checkedCount === 1 ? "" : "s"}` : "No saved page checks yet"}</strong>{changeGraph.checkedCount ? ` · ${changeGraph.differenceCount} observed difference${changeGraph.differenceCount === 1 ? "" : "s"} · ${changeGraph.unreachableCount} became unreachable · ${changeGraph.nonComparableCount} not comparable` : " · Run a new collection or inspect a cited source to establish the first immutable page baseline."}</p></div></div>
      {changeGraph.events.length ? <div className="table-wrap"><table><thead><tr><th>Checked</th><th>Source</th><th>Observed difference</th><th>Evidence context</th><th>Inspect</th></tr></thead><tbody>{changeGraph.events.map((event) => { const sourceEntryId = sourceEntryById.get(event.sourceId); return <tr key={event.id}><td>{snapshotDate(event.checkedAt)}</td><td><strong>{event.pageTitle || sourceHost(event.canonicalUrl)}</strong><div className="table-caption">{sourceHost(event.finalUrl)}</div></td><td><strong>{event.changeState === "unreachable" ? "Became unreachable" : "Observed difference"}</strong><div className="table-caption">{event.changeReason || "The saved page observation differed from its preceding baseline."}</div></td><td>{event.collectionLinked ? `${event.linkedObservationCount} linked citation observation${event.linkedObservationCount === 1 ? "" : "s"}` : "Manual page check"}</td><td>{sourceEntryId ? <Link className="text-link" href={`/app/sources/${sourceEntryId}`}>Open source →</Link> : <span>Source record</span>}</td></tr>; })}</tbody></table></div> : <div className="empty-state empty-state--border"><h2>{changeGraph.checkedCount ? "No page differences have been observed yet." : "The Change Graph needs its first saved page observation."}</h2><p>{changeGraph.checkedCount ? `Foremention preserved ${changeGraph.baselineCount} first baseline check${changeGraph.baselineCount === 1 ? "" : "s"} and ${changeGraph.unchangedCount} matching follow-up check${changeGraph.unchangedCount === 1 ? "" : "s"}. Nothing is being promoted into a change event without persisted evidence.` : "Future collections and manual source inspections will append bounded page fingerprints here. Historical records remain immutable."}</p><Link className="text-link" href="/app/source-map">Open Sources →</Link></div>}
      <p className="table-caption panel-heading--padded">A fingerprint or reachability difference shows that the bounded public-page observation changed between two saved checks. It does not establish causation, editorial acceptance, AI ranking movement, traffic, leads, or revenue.</p>
    </section>

    <section className="panel panel--flush"><div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Recent collections</span><h2>See the denominator behind every observation.</h2><p>Latest first. These rows are preserved observations; only the current baseline and an exact matching prior run are used for the trend above.</p></div></div><div className="run-table"><div className="run-row run-row--head"><span>Date</span><span>Status</span><span>Answers</span><span>Citations</span><span>Brand presence</span><span>First mention</span><span>New sources</span><span>Inspect</span></div>{recentRuns.map((run) => <Link className="run-row" href={`/app/runs/${run.id}`} key={run.id}><strong>{run.date}</strong><span>{productStateLabel(stateForRun({ status: run.status, answerCount: run.answers, citationCount: run.citations }))}</span><strong>{run.answers}</strong><strong>{run.citations}</strong><span>{run.presence}% of {run.answers}</span><span>{run.firstMention}% of {run.answers}</span><strong>{run.newSources}</strong><span>Open →</span></Link>)}</div></section>

    <section className="panel panel--flush question-performance"><div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Question performance</span><h2>Which buyer questions produce inspectable evidence?</h2><p>Based on citations and exact brand mentions in human-verified answers. This is evidence yield, not search volume or revenue value. It does not estimate demand.</p></div></div>{questions.length ? <div className="question-performance__table"><div className="question-performance__row question-performance__head"><span>Buyer question</span><span>Reviewed runs</span><span>Citations</span><span>Cited answer rate</span><span>Brand mentions</span><span>Guidance</span></div>{questions.map((question) => <div className="question-performance__row" key={question.key}><strong>{question.question}</strong><span>{question.runCount}</span><span>{question.citationCount}</span><span>{question.citedAnswerPct}% across {question.runCount}</span><span>{question.brandMentionCount}</span><span>{question.guidance}</span></div>)}</div> : <div className="empty-state"><h2>No verified question results yet.</h2><p>Review the first completed collection to compare evidence yield by buyer question.</p></div>}</section>
  </main>;
}
