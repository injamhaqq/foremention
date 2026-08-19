import Link from "next/link";
import { Arrow } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadTruthfulDecisionSignal } from "@/lib/evidence-integrity-data";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

const value = (number: number | null, suffix = "%") => number === null ? "Needs data" : `${number}${suffix}`;
const actionLabel = (href: string) => href.startsWith("/app/runs") ? "Open AI Results" : href.startsWith("/app/settings") ? "Connect provider" : href.startsWith("/app/source-map") ? "Review sources" : href.startsWith("/app/opportunities") ? "Open Opportunities" : "Open next step";

export default async function DecisionLabPage() {
  const viewer = await requireViewer("/app/decision-lab");
  const [signal, intelligence] = await Promise.all([
    loadTruthfulDecisionSignal(viewer),
    loadSafeWeeklyIntelligence(viewer),
  ]);
  const exactComparablePair = Boolean(
    intelligence.latest
    && intelligence.previous
    && signal.latestRunId === intelligence.latest.id,
  );
  const exactPresenceDelta = exactComparablePair && intelligence.latest && intelligence.previous
    ? intelligence.latest.presence - intelligence.previous.presence
    : null;
  const evidenceReady = Boolean(
    exactComparablePair
    && signal.answerCompletionPct !== null
    && signal.answerCompletionPct >= 90
    && signal.providerCount >= 2
    && signal.sourceReviewPct !== null
    && signal.sourceReviewPct >= 80,
  );
  const decisionReadiness = evidenceReady ? "ready" : signal.answerCount > 0 ? "directional" : "insufficient";
  const readinessLabel = decisionReadiness === "ready" ? "Decision-ready" : decisionReadiness === "directional" ? "Directional only" : "Insufficient evidence";
  const evidenceChecks = [
    {
      label: "Collection coverage",
      value: value(signal.answerCompletionPct),
      detail: signal.answerCompletionPct === null ? "Requires a finalized provider run with known prompt and provider capacity." : `${signal.answerCount} verified answers across ${signal.promptCount} buyer questions in the latest finalized collection.`,
      tone: signal.answerCompletionPct !== null && signal.answerCompletionPct >= 90 ? "good" : "attention",
    },
    {
      label: "Provider agreement",
      value: value(signal.recommendationConsensusPct),
      detail: signal.recommendationConsensusPct === null ? "Requires at least two providers answering the same buyer-question wording in the latest finalized run." : "Agreement on whether the brand appears for identical buyer-question wording inside the latest finalized run.",
      tone: signal.recommendationConsensusPct !== null && signal.recommendationConsensusPct >= 70 ? "good" : "attention",
    },
    {
      label: "Source review",
      value: value(signal.sourceReviewPct),
      detail: signal.sourceReviewPct === null ? "No Source Map is available for the finalized baseline run." : "Mapped pages with an explicit persisted human review. Automated crawler checks do not count.",
      tone: signal.sourceReviewPct !== null && signal.sourceReviewPct >= 80 ? "good" : "attention",
    },
    {
      label: "Source concentration",
      value: value(signal.sourceDependencyPct),
      detail: signal.sourceDependencyPct === null ? "Citation observations are required before source concentration can be described." : "Share of baseline citation observations held by the three most recurrent sources. This is an evidence-diversity signal, not a quality or authority score.",
      tone: signal.sourceDependencyPct !== null && signal.sourceDependencyPct < 50 ? "good" : "attention",
    },
    {
      label: "Exact repeatability",
      value: exactComparablePair ? "Passed" : "Needs repeat",
      detail: exactComparablePair ? "The latest finalized baseline has a prior run with the same persisted buyer-question wording, provider, exact model, and methodology." : "No exact comparable prior run exists for the latest finalized baseline. Movement is withheld.",
      tone: exactComparablePair ? "good" : "attention",
    },
  ];
  const actions = exactComparablePair
    ? signal.actions
    : [{ priority: "now" as const, title: "Repeat the exact evidence set", reason: "Decision-ready movement requires the same buyer-question wording, provider, exact model, and methodology. Other finalized runs remain valid observations but cannot substitute for this comparison.", href: "/app/runs" }, ...signal.actions].slice(0, 4);

  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Answer reliability</span>
        <h1>Decision Lab</h1>
        <p>Know whether a recommendation pattern is stable enough to act on. Foremention uses verified answers from finalized collections, explicit human source review, and an exact run-to-run comparability gate before it labels a conclusion decision-ready.</p>
      </div>
      <span className={`readiness-badge readiness-badge--${decisionReadiness}`}>{readinessLabel}</span>
    </div>

    {viewer.mode === "demo" && <div className="demo-disclosure"><strong>Fictional product demonstration</strong><span>These values show the workflow and do not describe a real company or live provider collection.</span></div>}

    <section className="decision-hero">
      <div className="decision-orbit" aria-label={`${readinessLabel}. ${signal.reviewedRuns} finalized runs and ${signal.providerCount} providers.`}>
        <div className="decision-orbit__ring decision-orbit__ring--one" />
        <div className="decision-orbit__ring decision-orbit__ring--two" />
        <div className="decision-orbit__core"><span>Current read</span><strong>{readinessLabel}</strong><small>{signal.reviewedRuns} finalized runs · {signal.providerCount} providers</small></div>
        <span className="decision-orbit__point decision-orbit__point--one">Coverage</span>
        <span className="decision-orbit__point decision-orbit__point--two">Agreement</span>
        <span className="decision-orbit__point decision-orbit__point--three">Sources</span>
      </div>
      <div className="decision-summary">
        <span className="eyebrow">What changed</span>
        <h2>{exactPresenceDelta === null ? "No exact comparable pair yet." : `${exactPresenceDelta >= 0 ? "+" : ""}${exactPresenceDelta} points across the exact comparable pair.`}</h2>
        <p>{exactPresenceDelta === null ? "Foremention will not turn two merely adjacent collections into a trend. Repeat the exact buyer-question wording with the same provider, exact model, and methodology first." : `Current baseline: ${intelligence.latest?.presence}% brand presence. Exact comparable prior: ${intelligence.previous?.presence}%. This is observed movement, not evidence that any action caused the change.`}</p>
        <dl>
          <div><dt>Latest finalized evidence</dt><dd>{signal.latestRunDate || "Not available"}</dd></div>
          <div><dt>Evidence observations</dt><dd>{signal.evidenceObservations || "None"}</dd></div>
          <div><dt>Recurring mapped sources</dt><dd>{value(signal.recurringSourcePct)}</dd></div>
        </dl>
      </div>
    </section>

    <section className="decision-checks" aria-labelledby="decision-checks-title">
      <div className="decision-section-heading"><div><span className="eyebrow">Evidence gate</span><h2 id="decision-checks-title">Five checks before action.</h2></div><p>A weak check stays visible. No composite score hides missing evidence.</p></div>
      <div className="decision-check-grid">
        {evidenceChecks.map((check, index) => <article className={`decision-check decision-check--${check.tone}`} key={check.label}>
          <span>{String(index + 1).padStart(2, "0")} · {check.label}</span>
          <strong>{check.value}</strong>
          <p>{check.detail}</p>
        </article>)}
      </div>
    </section>

    <section className="decision-actions" aria-labelledby="decision-actions-title">
      <div className="decision-section-heading"><div><span className="eyebrow">Controlled next moves</span><h2 id="decision-actions-title">Act on the weakest evidence first.</h2></div><p>Priorities are generated from workspace records. They are recommendations for review, not promised outcomes.</p></div>
      <div className="decision-action-list">
        {actions.map((action, index) => <article key={`${action.title}-${index}`}>
          <span className={`decision-priority decision-priority--${action.priority}`}>{action.priority}</span>
          <div><small>Action {String(index + 1).padStart(2, "0")}</small><h3>{action.title}</h3><p>{action.reason}</p></div>
          <Link href={action.href}>{actionLabel(action.href)} <Arrow /></Link>
        </article>)}
      </div>
    </section>

    <section className="decision-note">
      <strong>Why this is different</strong>
      <p>Visibility tells you what an answer said. Decision Lab tells you whether finalized verified observations have enough coverage, agreement, source diversity, exact repeatability, and human-reviewed source evidence to justify action.</p>
      <Link href="/methodology">Read the measurement standard <Arrow /></Link>
    </section>
  </main>;
}
