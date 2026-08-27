"use client";

export function MissingAnswerExperience() {
  return <div className="registered-hero shell">
    <div className="registered-hero__copy">
      <span className="registered-kicker">THE RECOMMENDATION STANDARD</span>
      <h1>Register. Prove.<br />Prepare.</h1>
      <p className="registered-hero__descriptor">Recommendation intelligence for B2B software.</p>
      <p className="registered-hero__lede">See how AI-mediated buyers frame your category, which vendors are recommended, what evidence came back, and what you can safely act on.</p>
      <div className="registered-hero__actions">
        <a className="registered-button" href="#recommendation-record">See an example</a>
        <a className="registered-text-link" href="/methodology">Methodology</a>
      </div>
    </div>

    <section className="registered-record" id="recommendation-record" aria-labelledby="registered-record-title">
      <div className="registered-record__header"><span>LIVE RECORD / ILLUSTRATIVE</span></div>
      <h2 id="registered-record-title">“What is the best platform for enterprise product marketing?”</h2>
      <div className="registered-record__body">
        <dl className="registered-record__states">
          <div><dt>ANSWER</dt><dd>Observed</dd></div>
          <div><dt>REFERENCE</dt><dd>Returned</dd></div>
          <div><dt>SOURCE</dt><dd>Retrievable</dd></div>
          <div><dt>REVIEW</dt><dd className="is-pending">Pending</dd></div>
        </dl>
        <div className="registered-record__signal" aria-hidden="true">
          <span className="registered-record__rings" />
          <span className="registered-record__beam" />
          <span className="registered-record__horizon registered-record__horizon--one" />
          <span className="registered-record__horizon registered-record__horizon--two" />
          <span className="registered-record__horizon registered-record__horizon--three" />
          <span className="registered-record__point" />
        </div>
      </div>
    </section>

    <section className="registered-foundation" aria-labelledby="registered-foundation-title">
      <span className="registered-kicker">FROM OBSERVATION TO INSPECTABLE RECORD</span>
      <h2 id="registered-foundation-title">The recommendation is only the start.</h2>
      <p>Foremention preserves the question, provider, answer, returned references, distinct sources, retrievability, review state and later comparison eligibility.</p>
      <div className="registered-foundation__grid">
        <article><span>01</span><h3>Recommendation Record</h3><p>A canonical, timestamped observation — not a generic score.</p></article>
        <article><span>02</span><h3>Evidence inspection</h3><p>Inspect what came back, what was retrievable, what was reviewed, and what remains uncertain inside the record.</p></article>
        <article><span>03</span><h3>Comparable later measurement</h3><p>Track change only when the later observation is actually comparable.</p></article>
      </div>
    </section>
  </div>;
}
