"use client";

import { CanonicalSignalField } from "@/components/canonical-signal-field";

type PillarIcon = "register" | "prove" | "prepare";

const pillars = [
  ["register", "Register", "Capture signals as immutable records."],
  ["prove", "Prove", "Verify provenance with integrity at every step."],
  ["prepare", "Prepare", "Make confident decisions with real evidence."],
] as const satisfies ReadonlyArray<readonly [PillarIcon, string, string]>;

function PillarIcon({ type }: { type: PillarIcon }) {
  if (type === "register") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="7" /><circle className="is-fill" cx="16" cy="16" r="2" /><path d="M22.5 9.5 28 4M24 4h4v4" /></svg>;
  }
  if (type === "prove") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5 25 7v7.2c0 6.4-3.8 11.2-9 14.3-5.2-3.1-9-7.9-9-14.3V7l9-3.5Z" /><path d="m11.5 16 3 3 6-7" /></svg>;
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" /><path d="m10.5 16.2 3.7 3.8 7.7-8.1" /></svg>;
}

export function MissingAnswerExperience() {
  return <div className="canonical-home shell">
    <div className="canonical-home__hero canonical-home__hero--reference">
      <div className="canonical-home__copy">
        <span className="canonical-kicker">THE FOREMENTION STANDARD</span>
        <h1 aria-label="Register. Prove. Prepare.">
          <span>Register<span className="canonical-home__dot">.</span></span>{" "}
          <span>Prove<span className="canonical-home__dot">.</span></span>{" "}
          <span>Prepare<span className="canonical-home__dot">.</span></span>
        </h1>
        <p className="canonical-home__descriptor canonical-home__descriptor--reference">Recommendation intelligence for B2B software.</p>

        <div className="canonical-home__pillars canonical-home__pillars--reference" aria-label="Register, Prove, Prepare">
          {pillars.map(([icon, title, body]) => <article key={title}>
            <PillarIcon type={icon} />
            <div><strong>{title}</strong><p>{body}</p></div>
          </article>)}
        </div>

        <div className="canonical-home__actions canonical-home__actions--reference">
          <a className="canonical-button canonical-button--primary" href="/contact">Request a demo <span aria-hidden="true">→</span></a>
          <a className="canonical-button canonical-button--secondary canonical-button--overview" href="#recommendation-record"><span aria-hidden="true">▷</span> View overview</a>
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
        <div><dt>ANSWER</dt><dd><span>Observed</span><small>Provider response preserved.</small></dd></div>
        <div><dt>REFERENCE</dt><dd><span>Returned</span><small>Returned reference recorded.</small></dd></div>
        <div><dt>SOURCE</dt><dd><span>Retrievable</span><small>Public source can be inspected.</small></dd></div>
        <div className="is-pending"><dt>REVIEW</dt><dd><span>Pending</span><small>Human verification remains open.</small></dd></div>
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

      <div className="canonical-record__actions">
        <a className="canonical-record__inspect" href="/recommendation-record">Inspect evidence <span aria-hidden="true">→</span></a>
      </div>

      <div className="canonical-record__boundary">
        <span>CAUSAL RESTRAINT</span>
        <p>A returned or reviewed source does not, by itself, prove that the source caused the recommendation.</p>
      </div>
    </section>

    <section className="canonical-foundation registered-foundation" aria-labelledby="registered-foundation-title">
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
