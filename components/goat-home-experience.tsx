const sourceCards = [
  ["Editorial source", "Independent category guide", "Names a competitor in a decision-making comparison."],
  ["Review source", "Verified review category", "Adds current customer evidence to the category record."],
  ["Research source", "Industry benchmark", "Supplies an evidence point that other pages reuse."],
] as const;

export function MissingAnswerExperience() {
  return <div className="goat-hero__grid shell">
    <div className="goat-hero__copy">
      <span className="goat-kicker">Recommendation intelligence for AI discovery</span>
      <h1>Know what shapes the <em>AI shortlist.</em></h1>
      <p><strong>AI answers influence the buying process before a buyer reaches your site.</strong> Foremention makes the questions, answers, brands, sources, and changes behind those answers legible to your team.</p>
      <div className="goat-hero__actions"><a className="button button--ink button--large" href="/signup">Create your workspace <span aria-hidden="true">&rarr;</span></a><a className="goat-text-link" href="/product">Explore the platform</a></div>
      <ul className="goat-trust-line" aria-label="Foremention principles"><li>Buyer questions</li><li>Exact sources</li><li>Dated evidence</li><li>Clear limits</li></ul>
    </div>
    <section className="missing-demo" aria-labelledby="monitor-title">
      <div className="missing-demo__bar"><strong id="monitor-title">Recommendation Monitor</strong><span>Workspace overview</span></div>
      <div className="missing-demo__answer"><span>Category intelligence</span><p className="missing-demo__question">Buyer questions &rarr; observed answers &rarr; source evidence</p><div className="monitor-metrics"><div><strong>24</strong><span>tracked questions</span></div><div><strong>87</strong><span>source pages</span></div><div><strong>6</strong><span>brand movements</span></div></div><strong>Every signal links back to the date, the answer, and the underlying source.</strong></div>
      <div className="monitor-records"><div><span>Source Map</span><b>New comparison source detected</b><small>Evidence recorded today</small></div><div><span>Movement</span><b>Competitor presence changed</b><small>Review in workspace</small></div><div><span>Collection</span><b>Run history is complete</b><small>View answer records</small></div></div>
    </section>
  </div>;
}

export function SourceXRayExperience() {
  return <section className="xray-experience" id="source-xray" aria-labelledby="xray-title">
    <div className="xray-experience__intro"><div><span className="goat-kicker goat-kicker--light">Source X-Ray</span><h2 id="xray-title">See the evidence behind the answer.</h2></div><p>Foremention connects an observed answer to the pages, brands, and evidence signals that help explain it. The answer stays intact; the source layer becomes visible.</p></div>
    <div className="xray-product-shell">
      <div className="xray-stage is-all">
        <div className="xray-answer xray-answer--clean"><div className="xray-browser-bar"><span>AI answer record</span><span>Observed view</span></div><div className="xray-question">Which reporting platform fits a growing SaaS team?</div><small>Tracked answer</small><h3>Recommendations appear as a shortlist. Foremention records the brands and then reveals the evidence behind them.</h3><div className="xray-answer-grid"><article><strong>Brand A</strong><span>Present in the answer record.</span></article><article><strong>Brand B</strong><span>Present in the answer record.</span></article><article><strong>Brand C</strong><span>Present in the answer record.</span></article></div></div>
        <div className="xray-answer xray-answer--evidence"><div className="xray-browser-bar"><span>Source evidence layer</span><span>Exact pages</span></div><div className="xray-question">Buyer question &rarr; answer record &rarr; source page &rarr; named brand</div><small>What supports the observed result</small><h3>Each source is a dated record your team can inspect, compare, and revisit.</h3><div className="xray-answer-grid">{sourceCards.map(([type, title, body]) => <article key={title}><strong>{title}</strong><span>{body}</span><small>{type}</small></article>)}</div><b className="xray-absence">Evidence status: reviewable</b></div>
      </div>
      <aside className="xray-controls"><div><span>Product interface</span><h3>Source X-Ray</h3><p>One layer for the answer. One layer for the supporting evidence.</p></div><div className="xray-source-detail"><small>What the record preserves</small><strong>Source, brand, question, provider, time, and collection status.</strong><span>Teams can trace each signal back to its underlying record.</span><b>Designed for review</b></div><p className="xray-truth"><strong>Clear limits.</strong> Data collection status stays visible when a result is partial, unavailable, or still being verified.</p></aside>
    </div>
  </section>;
}
