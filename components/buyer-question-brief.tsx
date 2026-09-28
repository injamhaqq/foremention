import Link from "next/link";
import type { BuyerQuestionBrief } from "@/lib/buyer-question-brief-core";

const describeAttention = {
  reviewed_source_to_inspect: "Reviewed cited-page gap to inspect",
  candidate_answer_gap: "Answer-level comparison candidate",
  observation_only: "No reviewed gap established",
  undetermined: "Brand-presence review incomplete",
} as const;

/** One private, observed run only. Deliberately no auto-generated strategy or vanity score. */
export function BuyerQuestionBriefPanel({ brief }: { brief: BuyerQuestionBrief }) {
  const date = brief.runCreatedAt && Number.isFinite(Date.parse(brief.runCreatedAt))
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(brief.runCreatedAt))
    : null;
  return <section className="panel" aria-labelledby="buyer-question-evidence-heading" id="buyer-question-evidence">
    <span className="eyebrow">Buyer decision evidence</span>
    <h2 id="buyer-question-evidence-heading">Buyer-question competitive evidence packet</h2>
    <p>Use a real buyer question to locate a competitor name in an approved AI answer, inspect a source-reference URL recorded by the collection method, and decide whether a reviewed page warrants a customer-owned change. This view reads one finalized collection; it does not create new observations or imply a competitor caused an answer.</p>
    {brief.state !== "available" ? <div className="empty-state" role="status">
      <h3>{brief.state === "fictional" ? "Illustrative demo only" : "No verified private packet available"}</h3>
      <p>{brief.reason}</p>
      <Link className="button button--ink" href="/app/runs">Open collections</Link>
    </div> : <>
      <p className="table-caption"><strong>{brief.verifiedAnswerSlots} verified answer slot{brief.verifiedAnswerSlots === 1 ? "" : "s"}</strong>
        {date ? " · Collected " + date : ""} · {brief.questions.length} buyer question{brief.questions.length === 1 ? "" : "s"} · Single-run snapshot · Not a cross-run trend
      </p>
      <div className="competitor-grid">
        {brief.questions.map(q => <article className="panel" key={q.key} data-buyer-attention={q.attention}>
          <span className="eyebrow">{describeAttention[q.attention]}</span>
          <h3>{q.question}</h3>
          <dl>
            <div><dt>Verified answer slots</dt><dd>{q.verifiedAnswerSlots}</dd></div>
            <div><dt>Your brand present / absent / undetermined</dt><dd>{q.customerPresent} / {q.customerAbsent} / {q.presenceUndetermined}</dd></div>
            <div><dt>Distinct recorded source-reference URLs</dt><dd>{q.returnedCitationUrls}</dd></div>
          </dl>
          <p><strong>Recorded observation surface:</strong> {q.observedSurfaces.map(surface => surface.provider + " / " + surface.model + " (" + surface.verifiedAnswerSlots + " verified slot" + (surface.verifiedAnswerSlots === 1 ? "" : "s") + ")").join(", ")}. A hosted model or independent retrieval process is not equivalent to the model developer’s consumer AI application.</p>
          {q.competitorNameCandidates.length ? <p><strong>Literal competitor-name candidates:</strong> {q.competitorNameCandidates.map(c => c.name + " (" + c.observedAnswerSlots + " answer slot" + (c.observedAnswerSlots === 1 ? "" : "s") + ")").join(", ")}. These are text matches, not verified brand identity or market share.</p> : <p>No configured competitor name was detected in the verified answer text for this question.</p>}
          {q.reviewedCitationGaps.length ? <div>
            <strong>Same-run source references with explicit page review:</strong>
            <ul>{q.reviewedCitationGaps.slice(0, 3).map(s => <li key={s.url + ":" + s.competitor}>
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">Review cited page ↗</a> — the reviewer recorded {s.competitor} on that page and your brand absent; the page was recorded as a selected source reference in {s.observationCount} verified answer slot{s.observationCount === 1 ? "" : "s"}.
            </li>)}</ul>
            {q.reviewedCitationGaps.length > 3 ? <p>{q.reviewedCitationGaps.length - 3} additional reviewed citation–competitor pair(s) are in the underlying evidence; inspect the Source Map.</p> : null}
            <p><Link href="/app/source-map">Check page freshness, permissions and a legitimate action route →</Link></p>
          </div> : q.attention === "candidate_answer_gap" ? <p>A competitor-name candidate appeared while your brand was marked absent, but no matching recorded source-reference page in this run has an explicit corroborating human review. <Link href="/app/source-map">Review returned sources first →</Link></p> : null}
        </article>)}
      </div>
      {brief.runId ? <p><Link className="button button--ink" href={"/app/runs/" + brief.runId}>Open exact reviewed collection →</Link></p> : null}
    </>}
    <p className="table-caption">{brief.limitation}</p>
  </section>;
}
