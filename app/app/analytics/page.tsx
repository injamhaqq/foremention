import Link from "next/link";
import { AiObservationChangeGraphPanel } from "@/components/ai-observation-change-graph";
import { ProductTruthPanel } from "@/components/product-truth-panel";
import { requireViewer } from "@/lib/auth";
import { loadAiObservationChangeGraph } from "@/lib/ai-observation-change";
import { loadSourceChangeGraph } from "@/lib/change-graph";
import { loadRunAnswers, loadRuns } from "@/lib/data";
import { loadExactQuestionPerformance, loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { productStateLabel, stateForRun } from "@/lib/product-state";
import { productTruthForRunMetric } from "@/lib/product-truth";
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

export default async function AnalyticsPage() {
  const viewer = await requireViewer("/app/analytics");
  const [allRuns, questions, intelligence] = await Promise.all([
    loadRuns(viewer),
    loadExactQuestionPerformance(viewer),
    loadSafeWeeklyIntelligence(viewer),
  ]);
  const finalizedRuns = allRuns.filter((run) => ["complete", "partial"].includes(run.status));
  const latest = intelligence.latest;
  const previous = intelligence.previous;

  if (!latest) {
    const pendingOrFailed = allRuns.find((run) => ["queued", "running", "review", "failed"].includes(run.status));
    const state = stateForRun(pendingOrFailed ? { status: pendingOrFailed.status, answerCount: pendingOrFailed.answers, citationCount: pendingOrFailed.citations } : null);
    const waitingForReview = pendingOrFailed?.status === "review";
    return <main className="workspace" data-product-state={state}><div className="workspace-heading"><div><span className="eyebrow">Did anything change?</span><h1>Analytics</h1><p>Analytics begin only after persisted provider observations pass the human-review boundary. Foremention will never substitute demo values for customer data.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong></p></div></div><section className="panel empty-state empty-state--border"><h2>{pendingOrFailed?.status === "failed" ? "The latest collection needs another try." : waitingForReview ? "Your first collection is waiting for review." : pendingOrFailed ? "Your first collection is still running." : "No reviewed baseline exists yet."}</h2><p>{pendingOrFailed?.status === "failed" ? "The latest collection ended before a finalized reviewed baseline was ready. No zero-value placeholder is being presented as a result. Inspect the failed collection and retry when the AI system is available." : waitingForReview ? "Review or exclude the persisted answers before they enter customer-facing trend analytics." : pendingOrFailed ? "This page will populate automatically when real answers and citations arrive and pass review." : "Start the first connected AI collection. Foremention will never substitute demo values for customer data."}</p><Link className="button button--ink" href={pendingOrFailed ? `/app/runs/${pendingOrFailed.id}` : "/app/runs"}>Open AI Results →</Link></section></main>;
  }

  const sources = await loadTruthfulSourceMap(viewer, { runId: latest.id });
  const sourceIds = sources.flatMap((source) => source.sourceId ? [source.sourceId] : []);
  const [answers, changeGraph, aiObservationChangeGraph] = await Promise.all([
    loadRunAnswers(viewer, latest.id),
    loadSourceChangeGraph(viewer, sourceIds),
    loadAiObservationChangeGraph(viewer, latest.id, previous?.id || null),
  ]);
  const sourceEntryById = new Map(sources.flatMap((source) => source.sourceId ? [[source.sourceId, source.id] as const] : []));
  const recurringSources = sources.filter((source) => source.evidenceCount > 1).length;
  const pageCheckedCount = sources.filter((source) => source.crawlerAccess !== "unknown").length;
  const humanReviewedSourceCount = sources.filter((source) => Boolean(source.reviewedAt)).length;
  const recentRuns = finalizedRuns.slice(0, 8);
  const reviewedRunCount = finalizedRuns.length;
  const newestRun = allRuns[0] || null;
  const newestRunFailed = newestRun?.status === "failed";
  const state = newestRunFailed
    ? "FAILED_RECOVERABLE"
    : newestRun && ["queued", "running"].includes(newestRun.status)
      ? "COLLECTING"
      : newestRun?.status === "review"
        ? "NEEDS_REVIEW"
        : previous
          ? "COMPLETE"
          : "PARTIALLY_COMPLETE";
  const comparisonWindowNote = previous
    ? `Comparable prior collection ${previous.date}`
    : reviewedRunCount > 1
      ? "Other finalized reviewed collections exist, but no exact comparison pair is currently available for the latest baseline"
      : "A second exactly comparable finalized reviewed collection is required before Foremention reports movement";
  const metricTruth = [
    productTruthForRunMetric({
      id: "analytics-brand-presence",
      label: "Brand presence",
      source: "Human-verified AI answers in the current Safe Intelligence baseline",
      sample: `${latest.answers} verified answer${latest.answers === 1 ? "" : "s"}`,
      denominator: `${latest.answers} verified answer slot${latest.answers === 1 ? "" : "s"} in the current finalized reviewed collection`,
      collectedAt: latest.date,
      verification: "Only verified answer rows from a finalized reviewed collection enter this baseline",
      demo: viewer.mode === "demo",
      methodology: previous ? "Current and prior deltas passed the exact persisted buyer-question text, provider, exact model, and methodology gate." : "Baseline only. No movement is reported until an exact persisted buyer-question text, provider, exact model, and methodology match exists.",
    }),
    productTruthForRunMetric({
      id: "analytics-first-mention",
      label: "First mention",
      source: "Recorded first-position brand observations in the same verified AI answer baseline",
      sample: `${latest.answers} verified answer${latest.answers === 1 ? "" : "s"}`,
      denominator: `${latest.answers} verified answer slot${latest.answers === 1 ? "" : "s"}; unknown positions are not invented`,
      collectedAt: latest.date,
      verification: "Human-review boundary passed before this finalized collection entered Analytics",
      demo: viewer.mode === "demo",
      methodology: previous ? "Delta uses only the exact comparable Safe Intelligence pair." : "Current finalized reviewed baseline only; no cross-collection delta is inferred.",
    }),
    productTruthForRunMetric({
      id: "analytics-citation-observations",
      label: "Citation observations",
      source: "Provider-returned citations preserved on verified AI answers",
      sample: `${latest.citations} returned citation observation${latest.citations === 1 ? "" : "s"}`,
      denominator: `${latest.answers} verified answer${latest.answers === 1 ? "" : "s"} in the current baseline; ${sources.length} unique mapped source record${sources.length === 1 ? "" : "s"} tied to that same run`,
      collectedAt: latest.date,
      verification: "Only returned citation evidence is counted; absent citations are not inferred",
      demo: viewer.mode === "demo",
      methodology: previous ? "Citation movement is shown only for the exact comparable reviewed pair." : "Current reviewed citation baseline only; recurring mapped sources do not substitute for a comparable run.",
    }),
    productTruthForRunMetric({
      id: "analytics-human-reviewed-sources",
      label: "Human-reviewed sources",
      source: "Current baseline Source Map records with an explicit persisted human review timestamp",
      sample: `${humanReviewedSourceCount} human-reviewed mapped page${humanReviewedSourceCount === 1 ? "" : "s"}`,
      denominator: `${sources.length} mapped cited page${sources.length === 1 ? "" : "s"} from this exact baseline run; ${pageCheckedCount} have a dated automated reachability check`,
      collectedAt: latest.date,
      verification: "An automated page check alone is not counted as human review; only an explicit source review qualifies",
      demo: viewer.mode === "demo",
      methodology: "Source review is separate from AI-answer verification and separate from Source Change Graph fingerprint observations.",
    }),
  ];

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading"><div><span className="eyebrow">Did anything change?</span><h1>Analytics</h1><p>Compare finalized reviewed collections, question evidence yield, source-review progress, and saved cited-page changes. Trend deltas appear only when Foremention finds the same exact persisted buyer-question text, provider, exact model, and methodology. Movement is observed change, not proof that an action caused it.</p><p className="table-caption"><strong>{productStateLabel(state)}</strong> · Current reviewed baseline {latest.date} · {latest.answers} answer{latest.answers === 1 ? "" : "s"} · {comparisonWindowNote}</p></div><Link className="button button--outline" href="/app/runs">Inspect AI Results</Link></div>

    {newestRunFailed && newestRun && <section className="inline-notice" role="alert"><strong>The newest collection failed.</strong><p>The prior reviewed baseline below remains intact and is not replaced by the failed collection. Open the failed run to inspect the operational error before retrying; no failed-run zeros are mixed into Analytics.</p><Link href={`/app/runs/${newestRun.id}`}>Inspect newest collection →</Link></section>}

    <div className="metric-grid"><article><span>Brand presence</span><strong>{latest.presence}%</strong><small>{latest.answers} verified answer{latest.answers === 1 ? "" : "s"}{previous ? ` · ${signed(latest.presence - previous.presence)} pts vs comparable prior` : " · reviewed baseline only"}</small></article><article><span>First mention</span><strong>{latest.firstMention}%</strong><small>{latest.answers} verified answer{latest.answers === 1 ? "" : "s"}{previous ? ` · ${signed(latest.firstMention - previous.firstMention)} pts vs comparable prior` : " · reviewed baseline only"}</small></article><article><span>Citation observations</span><strong>{latest.citations}</strong><small>{previous ? `${signed(latest.citations - previous.citations)} vs comparable prior` : `${recurringSources} recurring mapped sources · no trend delta yet`}</small></article><article><span>Human-reviewed sources</span><strong>{humanReviewedSourceCount} of {sources.length}</strong><small>{sources.length - humanReviewedSourceCount} cited page{sources.length - humanReviewedSourceCount === 1 ? "" : "s"} still need human review · {pageCheckedCount} automated page check{pageCheckedCount === 1 ? "" : "s"} recorded</small></article></div>
    <ProductTruthPanel metrics={metricTruth} title="Why you can trust these Analytics metrics" />

    <AiObservationChangeGraphPanel graph={aiObservationChangeGraph} />

    <div className="analytics-grid"><section className="panel panel--wide"><span className="eyebrow">Comparable brand presence</span><h2>{previous ? "Exact comparison pair" : "One comparable baseline so far"}</h2>{previous ? <div className="trend-chart trend-chart--dynamic" style={{ gridTemplateColumns: "repeat(2, minmax(80px, 1fr))" }} role="img" aria-label="Brand presence across the comparable prior and current reviewed collections"><div><i style={{ height: `${Math.max(2, previous.presence)}%` }} /><span>Prior</span><small>{previous.presence}%</small></div><div><i style={{ height: `${Math.max(2, latest.presence)}%` }} /><span>Current</span><small>{latest.presence}%</small></div></div> : <div className="baseline-record"><strong>{answers[0]?.provider}{answers[0]?.model ? ` · ${answers[0].model}` : ""}</strong><p>{answers[0] ? `${answers[0].citations.length} cited source${answers[0].citations.length === 1 ? "" : "s"} were preserved from this verified answer. Foremention will not compare this baseline with a run that changed the exact buyer-question text, provider, exact model, or methodology.` : "The finalized reviewed run establishes a baseline. A second exactly comparable collection is required before Foremention draws a trend."}</p></div>}<p className="table-caption">Only the exact comparable pair above is used for movement. Other finalized reviewed collections remain inspectable below but are not silently mixed into the trend.</p></section><section className="panel"><span className="eyebrow">Source review progress</span><h2>{humanReviewedSourceCount} of {sources.length} pages human-reviewed.</h2><div className="empty-state empty-state--compact"><p>{sources.length ? `${pageCheckedCount} cited page${pageCheckedCount === 1 ? " has" : "s have"} an automated reachability/content check; ${sources.length - humanReviewedSourceCount} still need the explicit human source review before they can become reviewed opportunities.` : "No cited sources are available for this baseline run."}</p><Link className="text-link" href="/app/source-map">Review Sources →</Link></div></section></div>

    <section className="panel panel--flush source-change-graph">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Source Change Graph</span><h2>Which cited pages actually changed?</h2><p>Foremention compares immutable bounded page observations from collections and manual source checks. It records fingerprint and reachability differences without storing page bodies or claiming why a page changed.</p><p className="table-caption"><strong>{changeGraph.checkedCount ? `${changeGraph.checkedCount} saved page check${changeGraph.checkedCount === 1 ? "" : "s"}` : "No saved page checks yet"}</strong>{changeGraph.checkedCount ? ` · ${changeGraph.differenceCount} observed difference${changeGraph.differenceCount === 1 ? "" : "s"} · ${changeGraph.unreachableCount} became unreachable · ${changeGraph.nonComparableCount} not comparable` : " · Run a new collection or inspect a cited source to establish the first immutable page baseline."}</p></div></div>
      {changeGraph.events.length ? <div className="table-wrap"><table><thead><tr><th>Checked</th><th>Source</th><th>Observed difference</th><th>Evidence context</th><th>Inspect</th></tr></thead><tbody>{changeGraph.events.map((event) => { const sourceEntryId = sourceEntryById.get(event.sourceId); return <tr key={event.id}><td>{snapshotDate(event.checkedAt)}</td><td><strong>{event.pageTitle || sourceHost(event.canonicalUrl)}</strong><div className="table-caption">{sourceHost(event.finalUrl)}</div></td><td><strong>{event.changeState === "unreachable" ? "Became unreachable" : "Observed difference"}</strong><div className="table-caption">{event.changeReason || "The saved page observation differed from its preceding baseline."}</div></td><td>{event.collectionLinked ? `${event.linkedObservationCount} linked citation observation${event.linkedObservationCount === 1 ? "" : "s"}` : "Manual page check"}</td><td>{sourceEntryId ? <Link className="text-link" href={`/app/sources/${sourceEntryId}`}>Open source →</Link> : <span>Source record</span>}</td></tr>; })}</tbody></table></div> : <div className="empty-state empty-state--border"><h2>{changeGraph.checkedCount ? "No page differences have been observed yet." : "The Change Graph needs its first saved page observation."}</h2><p>{changeGraph.checkedCount ? `Foremention preserved ${changeGraph.baselineCount} first baseline check${changeGraph.baselineCount === 1 ? "" : "s"} and ${changeGraph.unchangedCount} matching follow-up check${changeGraph.unchangedCount === 1 ? "" : "s"}. Nothing is being promoted into a change event without persisted evidence.` : "Future collections and manual source inspections will append bounded page fingerprints here. Historical records remain immutable."}</p><Link className="text-link" href="/app/source-map">Open Sources →</Link></div>}
      <p className="table-caption panel-heading--padded">A fingerprint or reachability difference shows that the bounded public-page observation changed between two saved checks. It does not establish causation, editorial acceptance, AI ranking movement, traffic, leads, or revenue.</p>
    </section>

    <section className="panel panel--flush"><div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Recent finalized collections</span><h2>See the denominator behind every observation.</h2><p>Latest first. These rows are finalized preserved observations; only the current baseline and an exact matching prior run are used for the trend above.</p></div></div><div className="run-table"><div className="run-row run-row--head"><span>Date</span><span>Status</span><span>Answers</span><span>Citations</span><span>Brand presence</span><span>First mention</span><span>New sources</span><span>Inspect</span></div>{recentRuns.map((run) => <Link className="run-row" href={`/app/runs/${run.id}`} key={run.id}><strong>{run.date}</strong><span>{productStateLabel(stateForRun({ status: run.status, answerCount: run.answers, citationCount: run.citations }))}</span><strong>{run.answers}</strong><strong>{run.citations}</strong><span>{run.presence}% of {run.answers}</span><span>{run.firstMention}% of {run.answers}</span><strong>{run.newSources}</strong><span>Open →</span></Link>)}</div></section>

    <section className="panel panel--flush question-performance"><div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Question performance</span><h2>Which buyer questions produce inspectable evidence?</h2><p>Based on citations and exact brand mentions in human-verified answers. Edited wording creates a separate measurement identity instead of being merged into the old question. This is evidence yield, not search volume or revenue value.</p></div></div>{questions.length ? <div className="question-performance__table"><div className="question-performance__row question-performance__head"><span>Buyer question</span><span>Observed runs</span><span>Citations</span><span>Cited answer rate</span><span>Brand mentions</span><span>Guidance</span></div>{questions.map((question) => <div className="question-performance__row" key={question.key}><strong>{question.question}</strong><span>{question.runCount}</span><span>{question.citationCount}</span><span>{question.citedAnswerPct}% across {question.runCount}</span><span>{question.brandMentionCount}</span><span>{question.guidance}</span></div>)}</div> : <div className="empty-state"><h2>No verified question results yet.</h2><p>Review the first completed collection to compare evidence yield by exact buyer-question wording.</p></div>}</section>
  </main>;
}
