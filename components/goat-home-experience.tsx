"use client";

import { useRef, useState } from "react";
import { EvidenceReference, HonestyState, RunningLabel } from "@/components/evidence-standard-primitives";

const sourceCards = [
  { kind: "Returned reference", title: "[03] · Category comparison page", body: "Provider-returned URL preserved with the observed answer." },
  { kind: "Distinct source", title: "example.com/category-guide", body: "Retrievable page record · review pending." },
  { kind: "Competitor evidence", title: "Brand B appears in the answer", body: "Observed in this answer record · not inferred." },
] as const;

export function MissingAnswerExperience() {
  return <div className="fm-home-hero shell">
    <div className="fm-home-hero__copy goat-hero__copy">
      <span className="goat-kicker">Recommendation intelligence for B2B SaaS</span>
      <h1>See what AI recommends. Inspect the evidence behind the record.</h1>
      <p className="fm-home-hero__lede">Run the buyer questions that matter, record which brands appear, preserve returned citation URLs when providers supply them, review the evidence, and compare equivalent runs over time.</p>
      <div className="fm-home-hero__actions goat-hero__actions">
        <a className="button button--ink button--large" href="/signup">Create workspace <span aria-hidden="true">→</span></a>
        <a className="goat-text-link" href="#source-xray">Inspect the evidence</a>
      </div>
      <p className="fm-home-hero__disclosure">Private beta · Creating a workspace does not charge a card. Collection capacity is activated separately.</p>
    </div>

    <section className="fm-record" aria-labelledby="monitor-title">
      <div className="fm-record__topline"><strong id="monitor-title">Recommendation record</strong><span>Illustrative product interface</span></div>
      <div className="fm-record__question" aria-label="01 / QUESTION">
        <RunningLabel number="01" label="QUESTION" />
        <p>Which reporting platform fits a growing B2B SaaS team?</p>
      </div>
      <div className="fm-record__row" aria-label="02 / ANSWER">
        <RunningLabel number="02" label="ANSWER" />
        <div><strong>Brand A, Brand B, and Brand C appear in the observed answer.</strong><p>Named brands stay attached to the exact provider response and collection time.</p></div>
      </div>
      <div className="fm-record__row fm-record__row--evidence">
        <div><EvidenceReference>[03]</EvidenceReference></div>
        <div><strong>Returned reference</strong><p>example.com/category-guide · provider-returned URL</p></div>
      </div>
      <div className="fm-record__row fm-record__row--evidence" aria-label="SOURCE / 03">
        <RunningLabel number="SOURCE" label="03" />
        <div><strong>Distinct source · retrievable</strong><p>The returned URL becomes a dated source record. Retrievability does not equal human review.</p></div>
      </div>
      <div className="fm-record__row" aria-label="04 / REVIEW">
        <RunningLabel number="04" label="REVIEW" />
        <div><strong>Human review pending</strong><p>Observation, later analysis, and human judgment remain visibly separate.</p></div>
      </div>
      <div className="fm-record__row" aria-label="06 / COMPARE">
        <RunningLabel number="06" label="COMPARE" />
        <div><strong>One run is a record, not a trend.</strong><p>A later run becomes comparable only when the measurement setup is equivalent.</p></div>
      </div>
      <div className="fm-record__footer" aria-label="— NOT OBSERVED · ≠ NOT COMPARABLE · ± INSUFFICIENT EVIDENCE">
        <HonestyState tone="not-observed" />
        <HonestyState tone="not-comparable" />
        <HonestyState tone="insufficient" />
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
          <div className="xray-question">01 / QUESTION · Which reporting platform fits a growing B2B SaaS team?</div>
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
