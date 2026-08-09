"use client";

import { useRef, useState } from "react";

const sourceCards = [
  ["Editorial source", "Independent category guide", "Names a competitor in a decision-making comparison."],
  ["Review source", "Verified review category", "Adds current customer evidence to the category record."],
  ["Research source", "Industry benchmark", "Supplies an evidence point that other pages reuse."],
] as const;

export function MissingAnswerExperience() {
  return <div className="goat-hero__grid shell">
    <div className="goat-hero__copy">
      <span className="goat-kicker">AI recommendation visibility for B2B SaaS</span>
      <h1>See how your company appears in <em>AI recommendations.</em></h1>
      <p>Foremention tracks the buyer questions that matter to show <strong>whether your brand appears, which competitors appear instead, and which citation URLs an AI provider returns.</strong></p>
      <div className="goat-hero__actions"><a className="button button--ink button--large" href="/signup">Create your workspace <span aria-hidden="true">→</span></a><a className="goat-text-link" href="/product">Explore the platform</a></div>
      <ul className="goat-trust-line" aria-label="What Foremention helps you find"><li>Find brand mentions</li><li>Compare competitors</li><li>Inspect cited sources</li><li>Track what changed</li></ul>
    </div>
    <section className="missing-demo" aria-labelledby="monitor-title">
      <div className="missing-demo__bar"><strong id="monitor-title">Recommendation Monitor</strong><span>Illustrative product interface</span></div>
      <div className="missing-demo__answer"><span>Category intelligence</span><p className="missing-demo__question">Buyer questions → observed answers → source evidence</p><div className="monitor-metrics monitor-metrics--workflow"><div><strong>01</strong><span>Approve real questions</span></div><div><strong>02</strong><span>Collect dated answers</span></div><div><strong>03</strong><span>Review returned citations</span></div></div><strong>Every answer links back to its question, provider, and date. Returned citations remain attached when available.</strong></div>
      <div className="monitor-records"><div><span>Source Map</span><b>New returned citation detected</b><small>Illustrative evidence event</small></div><div><span>Movement</span><b>Competitor presence changed</b><small>Illustrative comparison event</small></div><div><span>Collection</span><b>Run history is complete</b><small>Illustrative run state</small></div></div>
    </section>
  </div>;
}

export function SourceXRayExperience() {
  const stage = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState({ x: 50, y: 50, radius: 112 });
  const [showAll, setShowAll] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  function moveLens(clientX: number, clientY: number) {
    const bounds = stage.current?.getBoundingClientRect();
    if (!bounds) return;
    setShowAll(false);
    setHasInteracted(true);
    setLens({ x: Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)), y: Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100)), radius: 112 });
  }

  function moveWithKeys(key: string) {
    const step = key === "PageUp" || key === "PageDown" ? 14 : 7;
    const direction = key === "ArrowLeft" ? [-step, 0] : key === "ArrowRight" ? [step, 0] : key === "ArrowUp" ? [0, -step] : key === "ArrowDown" ? [0, step] : null;
    if (!direction) return false;
    setShowAll(false);
    setHasInteracted(true);
    setLens((current) => ({ ...current, x: Math.max(0, Math.min(100, current.x + direction[0])), y: Math.max(0, Math.min(100, current.y + direction[1])) }));
    return true;
  }

  return <section className="xray-experience" id="source-xray" aria-labelledby="xray-title">
    <div className="xray-experience__intro"><div><span className="goat-kicker goat-kicker--light">Source X-Ray</span><h2 id="xray-title">Inspect what was returned with the answer.</h2></div><p>Foremention connects an observed answer to returned citation URLs, named brands, and reviewable evidence records. It keeps the answer separate from Foremention&apos;s later analysis.</p></div>
    <div className="xray-product-shell">
      <div id="source-xray-stage" ref={stage} className={`xray-stage${showAll ? " is-all" : ""}${hasInteracted ? " is-interacting" : " is-idle"}`} style={{ "--xray-x": `${lens.x}%`, "--xray-y": `${lens.y}%`, "--xray-radius": `${lens.radius}px` } as React.CSSProperties} tabIndex={0} role="group" aria-label="Interactive Source X-Ray" aria-describedby="xray-instructions" onPointerMove={(event) => moveLens(event.clientX, event.clientY)} onPointerDown={(event) => moveLens(event.clientX, event.clientY)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); setShowAll((current) => !current); setHasInteracted(true); } else if (moveWithKeys(event.key)) event.preventDefault(); }}>
        <span className="sr-only" id="xray-instructions">Move the pointer or use the arrow keys to inspect the evidence layer. Press Enter or Space to show or hide the full layer.</span>
        <div className="xray-answer xray-answer--clean"><div className="xray-browser-bar"><span>AI answer record</span><span>Observed view</span></div><div className="xray-question">Which reporting platform fits a growing SaaS team?</div><small>Tracked answer</small><h3>Recommendations appear as a shortlist. Foremention records the named brands and keeps returned citations alongside the answer when available.</h3><div className="xray-answer-grid"><article><strong>Brand A</strong><span>Present in the answer record.</span></article><article><strong>Brand B</strong><span>Present in the answer record.</span></article><article><strong>Brand C</strong><span>Present in the answer record.</span></article></div></div>
        <div className="xray-answer xray-answer--evidence"><div className="xray-browser-bar"><span>Source evidence layer</span><span>Returned citations</span></div><div className="xray-question">Buyer question → answer record → returned citation → named brand</div><small>What the provider returned with the answer</small><h3>Each returned citation becomes a dated record your team can inspect, compare, and revisit.</h3><div className="xray-answer-grid">{sourceCards.map(([type, title, body]) => <article key={title}><strong>{title}</strong><span>{body}</span><small>{type}</small></article>)}</div><b className="xray-absence">Evidence status: reviewable</b></div>
        <div className="xray-beam" aria-hidden="true" />
      </div>
      <aside className="xray-controls"><div><span>Illustrative product interface</span><h3>Source X-Ray</h3><p>One layer for the answer. One layer for returned citations and reviewed evidence.</p><button className="xray-toggle" type="button" aria-controls="source-xray-stage" aria-pressed={showAll} onClick={() => { setShowAll((current) => !current); setHasInteracted(true); }}>{showAll ? "Use inspection lens" : "Show full evidence"}<span aria-hidden="true">→</span></button><small className="xray-hint">Move the lens with your cursor, finger, or arrow keys.</small></div><div className="xray-source-detail"><small>What the record preserves</small><strong>Returned source URL, brand, question, provider, time, and collection status.</strong><span>Teams can trace each observation back to its underlying record.</span><b>Designed for review</b></div><p className="xray-truth"><strong>Clear limits.</strong> A provider may return no citations. Collection status stays visible when a result is partial, unavailable, or still being verified.</p></aside>
    </div>
  </section>;
}
