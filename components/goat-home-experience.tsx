"use client";

import { useRef, useState } from "react";
import styles from "./homepage-readiness.module.css";

const sourceCards = [
  ["Editorial source", "Independent category guide", "Names a competitor in a decision-making comparison."],
  ["Review source", "Verified review category", "Adds current customer evidence to the category record."],
  ["Research source", "Industry benchmark", "Supplies an evidence point that other pages reuse."],
] as const;

export function MissingAnswerExperience() {
  return <div className={`${styles.heroGrid} shell`}>
    <div className={`${styles.heroCopy} goat-hero__copy`}>
      <span className="goat-kicker">Recommendation intelligence for B2B SaaS</span>
      <h1>See how your brand appears in <em>AI answers.</em></h1>
      <p className={styles.heroLead}>Run the buyer questions that matter, see which brands appear, preserve returned citation URLs, and review the evidence before deciding what to do next.</p>
      <div className="goat-hero__actions">
        <a className="button button--ink button--large" href="/signup">Create a workspace <span aria-hidden="true">→</span></a>
        <a className="goat-text-link" href="#source-xray">Inspect the evidence</a>
      </div>
      <p className={styles.heroMeta}>No card charge for workspace creation. Collection capacity is activated separately.</p>
      <ul className="goat-trust-line" aria-label="What Foremention helps B2B SaaS teams do"><li>Track buyer questions</li><li>Compare competitors</li><li>Inspect cited sources</li><li>Review change over time</li></ul>
    </div>

    <section className={`${styles.preview} missing-demo`} aria-labelledby="monitor-title">
      <div className={styles.previewFrame}>
        <div className={styles.previewTopline}><strong id="monitor-title">Recommendation Monitor</strong><span>Illustrative product interface</span></div>
        <div className={styles.previewBody}>
          <div className={styles.previewAnswer}>
            <span className={styles.previewStatus}>Observed answer record</span>
            <p className={styles.previewQuestion}>Which reporting platform fits a growing B2B SaaS team?</p>
            <div className={styles.previewRows}>
              <div className={styles.previewRow}><span>Buyer question</span><strong>Approved and dated before collection</strong></div>
              <div className={styles.previewRow}><span>Provider result</span><strong>Named brands stay attached to the exact answer</strong></div>
              <div className={styles.previewRow}><span>Citations</span><strong>Returned URLs are preserved when the provider supplies them</strong></div>
              <div className={styles.previewRow}><span>Review state</span><strong>Observation, inference, and human review remain separate</strong></div>
            </div>
          </div>
          <aside className={styles.previewEvidence} aria-label="Illustrative evidence records">
            <div><small>Evidence layer</small><strong>Trace the conclusion back to its record.</strong></div>
            <div className={styles.previewEvidenceCard}><small>Returned citation</small><strong>Category comparison page</strong><span>Awaiting page review</span></div>
            <div className={styles.previewEvidenceCard}><small>Competitor presence</small><strong>Brand B appears in answer</strong><span>Observed, not inferred</span></div>
            <div className={styles.previewEvidenceCard}><small>Comparable rerun</small><strong>Not enough data yet</strong><span>No trend claimed from one run</span></div>
          </aside>
        </div>
      </div>
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
