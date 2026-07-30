import Link from "next/link";
import { Arrow } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadDecisionSignal } from "@/lib/data";

const value = (number: number | null, suffix = "%") => number === null ? "Needs data" : `${number}${suffix}`;
const actionLabel = (href: string) => href.startsWith("/app/runs") ? "Open Answer Runs" : href.startsWith("/app/settings") ? "Connect provider" : href.startsWith("/app/source-map") ? "Review sources" : href.startsWith("/app/opportunities") ? "Open Priority Gaps" : "Open next step";

export default async function DecisionLabPage() {
  const viewer = await requireViewer("/app/decision-lab");
  const signal = await loadDecisionSignal(viewer);
  const readinessLabel = signal.decisionReadiness === "ready" ? "Decision-ready" : signal.decisionReadiness === "directional" ? "Directional only" : "Insufficient evidence";
  const evidenceChecks = [
    {
      label: "Collection coverage",
      value: value(signal.answerCompletionPct),
      detail: signal.answerCompletionPct === null ? "Requires a reviewed run with known prompt and provider capacity." : `${signal.answerCount} reviewed answers across ${signal.promptCount} buyer questions.`,
      tone: signal.answerCompletionPct !== null && signal.answerCompletionPct >= 90 ? "good" : "attention",
    },
    {
      label: "Provider agreement",
      value: value(signal.recommendationConsensusPct),
      detail: signal.recommendationConsensusPct === null ? "Requires at least two providers answering comparable questions." : "Agreement on whether the brand appears for comparable questions.",
      tone: signal.recommendationConsensusPct !== null && signal.recommendationConsensusPct >= 70 ? "good" : "attention",
    },
    {
      label: "Source review",
      value: value(signal.sourceReviewPct),
      detail: signal.sourceReviewPct === null ? "No published Source Map is available." : "Mapped pages with a documented access and presence review.",
      tone: signal.sourceReviewPct !== null && signal.sourceReviewPct >= 80 ? "good" : "attention",
    },
    {
      label: "Source concentration",
      value: value(signal.sourceDependencyPct),
      detail: signal.sourceDependencyPct === null ? "Citation observations are required." : "Share of citation observations held by the three most recurrent sources. Lower is more diversified.",
      tone: signal.sourceDependencyPct !== null && signal.sourceDependencyPct < 50 ? "good" : "attention",
    },
  ];

  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Answer reliability</span>
        <h1>Decision Lab</h1>
        <p>Know whether a recommendation pattern is stable enough to act on. Foremention checks coverage, cross-provider agreement, run-to-run movement, source concentration, and review completeness before it labels a conclusion decision-ready.</p>
      </div>
      <span className={`readiness-badge readiness-badge--${signal.decisionReadiness}`}>{readinessLabel}</span>
    </div>

    {viewer.mode === "demo" && <div className="demo-disclosure"><strong>Fictional product demonstration</strong><span>These values show the workflow and do not describe a real company or live provider collection.</span></div>}

    <section className="decision-hero">
      <div className="decision-orbit" aria-label={`${readinessLabel}. ${signal.reviewedRuns} reviewed runs and ${signal.providerCount} providers.`}>
        <div className="decision-orbit__ring decision-orbit__ring--one" />
        <div className="decision-orbit__ring decision-orbit__ring--two" />
        <div className="decision-orbit__core"><span>Current read</span><strong>{readinessLabel}</strong><small>{signal.reviewedRuns} reviewed runs · {signal.providerCount} providers</small></div>
        <span className="decision-orbit__point decision-orbit__point--one">Coverage</span>
        <span className="decision-orbit__point decision-orbit__point--two">Agreement</span>
        <span className="decision-orbit__point decision-orbit__point--three">Sources</span>
      </div>
      <div className="decision-summary">
        <span className="eyebrow">What changed</span>
        <h2>{signal.presenceDelta === null ? "A second reviewed run is needed." : `${signal.presenceDelta >= 0 ? "+" : ""}${signal.presenceDelta} points since the previous reviewed run.`}</h2>
        <p>{signal.presenceRange === null ? "Foremention will not call a single observation a trend." : `Observed brand presence has moved across a ${signal.presenceRange}-point range in the available review window. This describes variability, not business impact.`}</p>
        <dl>
          <div><dt>Latest evidence</dt><dd>{signal.latestRunDate || "Not available"}</dd></div>
          <div><dt>Evidence observations</dt><dd>{signal.evidenceObservations || "None"}</dd></div>
          <div><dt>Recurring mapped sources</dt><dd>{value(signal.recurringSourcePct)}</dd></div>
        </dl>
      </div>
    </section>

    <section className="decision-checks" aria-labelledby="decision-checks-title">
      <div className="decision-section-heading"><div><span className="eyebrow">Evidence gate</span><h2 id="decision-checks-title">Four checks before action.</h2></div><p>A weak check stays visible. No composite score hides missing evidence.</p></div>
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
        {signal.actions.map((action, index) => <article key={action.title}>
          <span className={`decision-priority decision-priority--${action.priority}`}>{action.priority}</span>
          <div><small>Action {String(index + 1).padStart(2, "0")}</small><h3>{action.title}</h3><p>{action.reason}</p></div>
          <Link href={action.href}>{actionLabel(action.href)} <Arrow /></Link>
        </article>)}
      </div>
    </section>

    <section className="decision-note">
      <strong>Why this is different</strong>
      <p>Visibility tells you what an answer said. Decision Lab tells you whether the observation has enough coverage, agreement, history, and reviewed source evidence to justify action.</p>
      <Link href="/methodology">Read the measurement standard <Arrow /></Link>
    </section>
  </main>;
}
