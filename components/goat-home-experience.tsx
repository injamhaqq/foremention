"use client";

import { useRef, useState } from "react";

const sourceCards = [
  { kind: "Returned reference", title: "[03] · Category comparison page", body: "Provider-returned URL preserved with the observed answer." },
  { kind: "Distinct source", title: "example.com/category-guide", body: "Retrievable page record · review pending." },
  { kind: "Competitor evidence", title: "Brand B appears in the answer", body: "Observed in this answer record · not inferred." },
] as const;

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
    setLens({
      x: Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100)),
      radius: 112,
    });
  }

  function moveWithKeys(key: string) {
    const step = 7;
    const direction = key === "ArrowLeft" ? [-step, 0] : key === "ArrowRight" ? [step, 0] : key === "ArrowUp" ? [0, -step] : key === "ArrowDown" ? [0, step] : null;
    if (!direction) return false;
    setShowAll(false);
    setHasInteracted(true);
    setLens((current) => ({
      ...current,
      x: Math.max(0, Math.min(100, current.x + direction[0])),
      y: Math.max(0, Math.min(100, current.y + direction[1])),
    }));
    return true;
  }

  return <section className="xray-experience" id="source-xray" aria-labelledby="xray-title">
    <div className="xray-experience__intro">
      <div><span className="goat-kicker goat-kicker--light">02 / Source X-Ray</span><h2 id="xray-title">What evidence came with the answer?</h2></div>
      <p>Foremention keeps an observed AI answer attached to the returned references that accompanied it, then separates retrievability, review, later analysis, and decision state. A returned source is evidence of what came with the answer—not proof that the source caused the answer.</p>
    </div>
    <div className="xray-product-shell">
      <div
        id="source-xray-stage"
        ref={stage}
        className={`xray-stage${showAll ? " is-all" : ""}${hasInteracted ? " is-interacting" : " is-idle"}`}
        style={{ "--xray-x": `${lens.x}%`, "--xray-y": `${lens.y}%`, "--xray-radius": `${lens.radius}px` } as React.CSSProperties}
        tabIndex={0}
        role="group"
        aria-label="Interactive Source X-Ray"
        aria-describedby="xray-instructions"
        onPointerMove={(event) => moveLens(event.clientX, event.clientY)}
        onPointerDown={(event) => moveLens(event.clientX, event.clientY)}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            setShowAll((current) => !current);
            setHasInteracted(true);
          } else if (moveWithKeys(event.key)) {
            event.preventDefault();
          }
        }}
      >
        <span className="sr-only" id="xray-instructions">Move the pointer or use the arrow keys to inspect the evidence layer. Press Enter or Space to show or hide the full layer. The same evidence sequence is also summarized beside this interactive view.</span>
        <div className="xray-answer xray-answer--clean">
          <div className="xray-browser-bar"><span>Recommendation record</span><span>Observed answer</span></div>
          <div className="xray-question">01 / QUESTION · Which reporting platform fits a growing B2B software team?</div>
          <small>02 / ANSWER</small>
          <h3>Brand A, Brand B, and Brand C appear in the observed answer record.</h3>
          <div className="xray-answer-grid"><article><strong>Brand A</strong><span>Present in the answer record.</span><small>Observed</small></article><article><strong>Brand B</strong><span>Present in the answer record.</span><small>Observed</small></article><article><strong>Brand C</strong><span>Present in the answer record.</span><small>Observed</small></article></div>
        </div>
        <div className="xray-answer xray-answer--evidence">
          <div className="xray-browser-bar"><span>Evidence layer</span><span>Returned references</span></div>
          <div className="xray-question">Question → answer → returned reference → distinct source → review</div>
          <small>What the provider returned with the answer</small>
          <h3>Returned references become dated source records your team can retrieve, review, and revisit.</h3>
          <div className="xray-answer-grid">{sourceCards.map((card) => <article key={card.kind}><strong>{card.title}</strong><span>{card.body}</span><small>{card.kind}</small></article>)}</div>
          <b className="xray-absence">Evidence state · reviewable</b>
        </div>
        <div className="xray-beam" aria-hidden="true" />
      </div>
      <aside className="xray-controls">
        <div><span>Illustrative product interface</span><h3>Source X-Ray</h3><p>One layer for what the provider returned. One layer for the references and evidence records attached to that observation.</p><button className="xray-toggle" type="button" aria-controls="source-xray-stage" aria-pressed={showAll} onClick={() => { setShowAll((current) => !current); setHasInteracted(true); }}>{showAll ? "Use inspection lens" : "Show full evidence"}<span aria-hidden="true">→</span></button><small className="xray-hint">Move the lens with your cursor, finger, or arrow keys.</small></div>
        <div className="xray-source-detail"><small>Evidence sequence</small><strong>Returned reference → Distinct source → Retrievability → Human review → Decision implication</strong><span>The sequence remains readable with motion disabled and without interacting with the lens.</span><b>Evidence before theatre</b></div>
        <p className="xray-truth"><strong>Clear limits.</strong> A provider may return no citations. A URL may be unreachable. A retrieved page may still be unreviewed. Those states stay visible rather than being converted into a score.</p>
      </aside>
    </div>
  </section>;
}
