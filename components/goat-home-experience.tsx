"use client";

import { CanonicalSignalField } from "@/components/canonical-signal-field";

const pillars = [
  ["01", "Register", "Capture signals as inspectable records."],
  ["02", "Prove", "Verify provenance, retrieval and review."],
  ["03", "Prepare", "Make decisions with visible uncertainty."],
] as const;

export function MissingAnswerExperience() {
  return <div className="canonical-home shell">
    <div className="canonical-home__hero">
      <div className="canonical-home__copy">
        <span className="canonical-kicker">THE FOREMENTION STANDARD</span>
        <h1>Register. Prove. Prepare.</h1>
        <p className="canonical-home__descriptor">Recommendation intelligence for B2B software.</p>
        <p className="canonical-home__lede">Record the AI answers buyers see, preserve returned evidence, inspect what is actually retrievable and reviewed, then compare later only when the measurement remains equivalent.</p>

        <div className="canonical-home__pillars" aria-label="Register, Prove, Prepare">
          {pillars.map(([number, title, body]) => <article key={title}>
            <span>{number}</span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </article>)}
        </div>

        <div className="canonical-home__actions">
          <a className="canonical-button canonical-button--primary" href="/contact">Request a demo <span aria-hidden="true">→</span></a>
          <a className="canonical-button canonical-button--secondary" href="#recommendation-record">View overview</a>
        </div>
      </div>

      <CanonicalSignalField />
    </div>

    <section className="canonical-record" id="recommendation-record" aria-labelledby="registered-record-title">
      <div className="canonical-record__eyebrow">LIVE RECORD / ILLUSTRATIVE</div>
      <div className="canonical-record__heading">
        <div>
          <span>RECOMMENDATION RECORD</span>
          <h2 id="registered-record-title">“What is the best platform for enterprise product marketing?”</h2>
        </div>
        <dl className="canonical-record__meta">
          <div><dt>TYPE</dt><dd>Illustrative</dd></div>
          <div><dt>STATE</dt><dd>Review pending</dd></div>
        </dl>
      </div>

      <dl className="canonical-record__states">
        <div><dt>ANSWER</dt><dd>Observed</dd><small>Provider response preserved.</small></div>
        <div><dt>REFERENCE</dt><dd>Returned</dd><small>Returned reference recorded.</small></div>
        <div><dt>SOURCE</dt><dd>Retrievable</dd><small>Public source can be inspected.</small></div>
        <div className="is-pending"><dt>REVIEW</dt><dd>Pending</dd><small>Human verification remains open.</small></div>
      </dl>

      <div className="canonical-record__chain" aria-label="Evidence chain: returned, retrieved, observed, reviewed, safe conclusion">
        {[
          ["RETURNED", "is-complete"],
          ["RETRIEVED", "is-complete"],
          ["OBSERVED", "is-complete"],
          ["REVIEWED", "is-pending"],
          ["SAFE CONCLUSION", "is-withheld"],
        ].map(([label, state], index) => <div key={label} className={state}>
          <span aria-hidden="true" />
          <strong>{label}</strong>
          {index < 4 ? <i aria-hidden="true" /> : null}
        </div>)}
      </div>

      <div className="canonical-record__boundary">
        <span>CAUSAL RESTRAINT</span>
        <p>A returned or reviewed source does not, by itself, prove that the source caused the recommendation.</p>
      </div>
    </section>

    <section className="canonical-foundation" aria-labelledby="registered-foundation-title">
      <span className="canonical-kicker">FROM OBSERVATION TO INSPECTABLE RECORD</span>
      <h2 id="registered-foundation-title">The recommendation is only the start.</h2>
      <p>Foremention preserves the question, provider, answer, returned references, distinct sources, retrievability, review state and later comparison eligibility.</p>
      <div className="canonical-foundation__grid">
        <article><span>01</span><h3>Recommendation Record</h3><p>A canonical, timestamped observation — not a generic score.</p></article>
        <article><span>02</span><h3>Evidence inspection</h3><p>Inspect what came back, what was retrievable, what was reviewed, and what remains uncertain inside the record.</p></article>
        <article><span>03</span><h3>Comparable later measurement</h3><p>Track change only when the later observation is actually comparable.</p></article>
      </div>
    </section>
  </div>;
}
