"use client";

import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const sourcePages = [
  { type: "Editorial", title: "Independent category comparison", proof: "Names two competitors in a high-intent guide.", route: "Verified product brief + independent review" },
  { type: "Reviews", title: "Software review category", proof: "Competitors have current customer proof.", route: "Complete profile + honest customer reviews" },
  { type: "Research", title: "Industry benchmark", proof: "One rival supplies data writers reuse.", route: "Useful original category research" },
  { type: "Editorial", title: "Operator buying guide", proof: "Three competitors appear in the shortlist.", route: "Evidence-led editor pitch" },
  { type: "Ecosystem", title: "Integration marketplace", proof: "Your brand listing is missing.", route: "Verified direct submission" },
  { type: "Community", title: "Practitioner discussion", proof: "Real buyers discuss two rivals.", route: "Transparent expert participation" },
  { type: "Editorial", title: "Founder interview", proof: "A competitor owns the category story.", route: "Pitchable expertise + proof" },
  { type: "Reviews", title: "Verified product profile", proof: "Your brand profile has thin evidence.", route: "Accurate facts + real reviews" },
  { type: "Research", title: "Annual market survey", proof: "The survey becomes a shared reference.", route: "Contribute reproducible data" },
  { type: "Ecosystem", title: "Partner directory", proof: "A direct listing route is open.", route: "Complete partner application" },
  { type: "Editorial", title: "Specialist newsletter", proof: "The category is explained without your brand.", route: "Original insight + product access" },
  { type: "Community", title: "Peer recommendation thread", proof: "Buyers repeat competitor names.", route: "Earn customer advocacy—never fake it" },
] as const;

const xraySources = [
  { id: "comparison", type: "Editorial source", title: "Independent buyer guide", support: "Supports Competitor A", signal: "Seen across 8 sample buyer questions", route: "Verified product brief + independent review", effort: "Medium" },
  { id: "reviews", type: "Review source", title: "Verified review category", support: "Supports Competitor B", signal: "Strong buying-intent evidence", route: "Complete profile + honest customer reviews", effort: "Medium" },
  { id: "research", type: "Research source", title: "Industry benchmark", support: "Supports Competitor C", signal: "Reused by writers and comparison pages", route: "Useful, reproducible category research", effort: "High" },
] as const;

const storySteps = [
  { label: "Buyer question", title: "A buyer asks for the best option.", body: "The journey starts before your website visit: “What is the best tool for my team?”" },
  { label: "AI answer", title: "A shortlist appears.", body: "The answer names competitors. Your brand is missing or appears too late." },
  { label: "Outside source", title: "The evidence lives on other pages.", body: "Reviews, comparisons, directories, reports, and discussions support the answer." },
  { label: "Competitor gap", title: "Rivals have proof where you do not.", body: "Foremention records the exact pages naming them and skipping you." },
  { label: "Entry route", title: "Every realistic source gets a route.", body: "Editorial evidence, authentic reviews, original research, or direct submission—never fake proof." },
  { label: "Citation watch", title: "Publication is only the middle.", body: "We check indexing, later citation observations, and how long the evidence survives." },
  { label: "Referral signal", title: "The work connects to demand.", body: "When access exists, AI referrals and sales signals are reported carefully without pretending perfect causation." },
] as const;

export function MissingAnswerExperience() {
  const [brand, setBrand] = useState("Your brand");
  const [question, setQuestion] = useState("What is the best reporting tool for a small SaaS team?");
  const [hasRun, setHasRun] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const cleanBrand = useMemo(() => brand.trim() || "Your brand", [brand]);

  function runDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasRun(true);
    setShowSources(false);
  }

  return (
    <div className="goat-hero__grid shell">
      <div className="goat-hero__copy">
        <span className="goat-kicker">Recommendation intelligence for AI discovery</span>
        <h1>Earn your place in the <em>AI shortlist.</em></h1>
        <p><strong>Your competitors are in the answer. You are not.</strong> Foremention reveals the outside pages helping them get picked, shows the legitimate route into each source, and tracks what changes after you earn the mention.</p>
        <div className="goat-hero__actions">
          <a className="button button--ink button--large" href="/source-gap">Find my source gaps <span aria-hidden="true">→</span></a>
          <a className="goat-text-link" href="/sample-report">Explore a sample Source Map</a>
        </div>
        <ul className="goat-trust-line" aria-label="Foremention principles">
          <li>Exact URLs</li><li>Legitimate routes</li><li>Observed outcomes</li><li>No ranking promise</li>
        </ul>
      </div>

      <section className={`missing-demo${showSources ? " is-open" : ""}`} aria-labelledby="missing-demo-title">
        <div className="missing-demo__bar"><strong id="missing-demo-title">The Missing Answer</strong><span>Interactive sample - no live AI call</span></div>
        <form className="missing-demo__form" onSubmit={runDemo}>
          <label><span>Your brand</span><input value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Your brand for the illustrative answer" /></label>
          <label><span>Buyer question</span><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Buyer question for the illustrative answer" /></label>
          <button type="submit">Run the buyer question <span aria-hidden="true">→</span></button>
        </form>
        <div className="missing-demo__answer" aria-live="polite">
          <span>Illustrative AI answer</span>
          {!hasRun ? (
            <p className="missing-demo__ready">Enter your brand. See the gap a real Source Map would investigate.</p>
          ) : (
            <>
              <p className="missing-demo__question">“{question}”</p>
              <ol><li>Competitor A</li><li>Competitor B</li><li>Competitor C</li></ol>
              <strong>{cleanBrand} is missing from this sample answer.</strong>
              <button className="missing-demo__reveal" type="button" aria-expanded={showSources} onClick={() => setShowSources((value) => !value)}>{showSources ? "Hide the outside pages" : "Reveal the 12 outside pages"}</button>
            </>
          )}
        </div>
        <div className="missing-demo__sources" aria-hidden={!showSources}>
          {sourcePages.slice(0, 6).map((source, index) => <span key={source.title} style={{ "--source-i": index } as CSSProperties}><small>{source.type}</small>{source.title}</span>)}
        </div>
      </section>
    </div>
  );
}

export function TwelvePagesExperience() {
  const [revealed, setRevealed] = useState(0);
  const [selected, setSelected] = useState(0);
  const active = sourcePages[selected];

  function revealNext() {
    const next = Math.min(revealed + 1, sourcePages.length);
    setRevealed(next);
    setSelected(Math.max(0, next - 1));
  }

  return (
    <section className="pages-experience" aria-labelledby="pages-title">
      <div className="pages-experience__copy">
        <span className="goat-kicker">The moment people remember</span>
        <h2 id="pages-title">One answer. A whole evidence layer underneath.</h2>
        <p>“Twelve pages” is a teaching idea, not a universal claim. A real check records the exact pages observed for your buyer questions.</p>
        <div className="pages-experience__controls">
          <button type="button" onClick={revealNext} disabled={revealed === sourcePages.length}>Reveal page {Math.min(revealed + 1, 12)} of 12</button>
          <button type="button" className="is-quiet" onClick={() => { setRevealed(0); setSelected(0); }}>Reset</button>
        </div>
        <div className="pages-experience__progress" aria-label={`${revealed} of 12 illustrative pages revealed`}><i style={{ width: `${(revealed / 12) * 100}%` }} /></div>
        <div className="pages-experience__detail" aria-live="polite">
          <small>{revealed ? `${active.type} - page ${selected + 1}` : "Ready to reveal"}</small>
          <h3>{revealed ? active.title : "The answer looks simple. The source stack is not."}</h3>
          <p>{revealed ? active.proof : "Open the stack to see the kinds of outside evidence Foremention investigates."}</p>
          {revealed > 0 && <strong>Legitimate route: {active.route}</strong>}
        </div>
      </div>
      <div className="pages-stack" aria-label="Twelve illustrative source pages">
        {sourcePages.map((source, index) => (
          <button
            type="button"
            key={source.title}
            className={index < revealed ? "is-revealed" : ""}
            style={{ "--page-i": index, zIndex: sourcePages.length - index } as CSSProperties}
            onClick={() => { setRevealed(Math.max(revealed, index + 1)); setSelected(index); }}
            aria-label={`Open illustrative source ${index + 1}: ${source.title}`}
            aria-hidden={index < revealed}
            tabIndex={index < revealed ? -1 : 0}
          >
            <small>{String(index + 1).padStart(2, "0")} / {source.type}</small>
            <strong>{source.title}</strong>
            <span>{source.proof}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SourceXRayExperience() {
  const [position, setPosition] = useState({ x: 62, y: 52 });
  const [radius, setRadius] = useState(125);
  const [enabled, setEnabled] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [activeId, setActiveId] = useState("comparison");
  const [announcement, setAnnouncement] = useState("Source X-Ray ready.");
  const dragging = useRef(false);
  const active = xraySources.find((source) => source.id === activeId) || xraySources[0];
  const stageStyle = {
    "--xray-x": `${position.x}%`,
    "--xray-y": `${position.y}%`,
    "--xray-radius": `${enabled ? radius : 0}px`,
  } as CSSProperties;

  function moveSpotlight(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || showAll) return;
    if (event.pointerType === "touch" && event.type === "pointermove" && !dragging.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    });
  }

  function moveWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!enabled || showAll || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 4;
    setPosition((current) => ({
      x: Math.max(0, Math.min(100, current.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))),
      y: Math.max(0, Math.min(100, current.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))),
    }));
    setAnnouncement("Source spotlight moved.");
  }

  return (
    <section className="xray-experience" id="source-xray" aria-labelledby="xray-title">
      <div className="xray-experience__intro">
        <div><span className="goat-kicker goat-kicker--light">The product moment</span><h2 id="xray-title">See the proof hiding under the answer.</h2></div>
        <p>Move the Source X-Ray across the sample. The clean shortlist stays on top. The evidence layer underneath shows which outside pages support each competitor.</p>
      </div>
      <div className="xray-product-shell">
        <div
          className={`xray-stage${showAll ? " is-all" : ""}`}
          style={stageStyle}
          tabIndex={0}
          aria-label="Interactive Source X-Ray sample. Move your pointer, drag, or use the arrow keys."
          onPointerMove={moveSpotlight}
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            moveSpotlight(event);
          }}
          onPointerUp={(event) => {
            dragging.current = false;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          onPointerCancel={() => { dragging.current = false; }}
          onKeyDown={moveWithKeys}
        >
          <div className="xray-answer xray-answer--clean">
            <div className="xray-browser-bar"><span>AI buying answer</span><span>Clean view</span></div>
            <div className="xray-question">What is the best reporting tool for a small SaaS team?</div>
            <small>Illustrative answer</small>
            <h3>Three popular choices are Competitor A, Competitor B, and Competitor C.</h3>
            <div className="xray-answer-grid"><article><strong>Competitor A</strong><span>Fast setup for small teams.</span></article><article><strong>Competitor B</strong><span>Flexible dashboards and reports.</span></article><article><strong>Competitor C</strong><span>Strong integrations and automation.</span></article></div>
          </div>
          <div className="xray-answer xray-answer--evidence" aria-hidden="true">
            <div className="xray-browser-bar"><span>Source evidence layer</span><span>Exact pages</span></div>
            <div className="xray-question">Buyer question → outside page → named brand → fair route in</div>
            <small>What helps support the answer</small>
            <h3>Each competitor has outside proof. Your brand is absent from this sample.</h3>
            <div className="xray-answer-grid">{xraySources.map((source) => <article key={source.id}><strong>{source.support}</strong><span>{source.title}</span><small>{source.type}</small></article>)}</div>
            <b className="xray-absence">Your brand: missing</b>
          </div>
          <div className="xray-beam" aria-hidden="true" />
          <span className="xray-hint">Move, touch, or use arrow keys to inspect</span>
        </div>
        <aside className="xray-controls">
          <div><span>Live product demonstration</span><h3>Source X-Ray</h3><p>Reveal the evidence without changing the answer.</p></div>
          <button type="button" className={enabled ? "is-active" : ""} aria-pressed={enabled} onClick={() => { setEnabled((value) => !value); setShowAll(false); setAnnouncement(enabled ? "Source X-Ray turned off." : "Source X-Ray turned on."); }}>{enabled ? "X-Ray is on" : "X-Ray is off"}</button>
          <button type="button" className={showAll ? "is-active" : ""} aria-pressed={showAll} onClick={() => { setEnabled(true); setShowAll((value) => !value); setAnnouncement(showAll ? "Spotlight view restored." : "Full evidence layer revealed."); }}>{showAll ? "Restore spotlight" : "Reveal all evidence"}</button>
          <label><span>Spotlight size</span><input type="range" min="70" max="230" value={radius} onChange={(event) => setRadius(Number(event.target.value))} aria-label="Source X-Ray spotlight size" /></label>
          <div className="xray-source-tabs" role="group" aria-label="Inspect sample sources">{xraySources.map((source) => <button key={source.id} type="button" className={activeId === source.id ? "is-selected" : ""} aria-pressed={activeId === source.id} onClick={() => setActiveId(source.id)}>{source.type}</button>)}</div>
          <div className="xray-source-detail" aria-live="polite"><small>{active.title}</small><strong>{active.signal}</strong><span>Fair route: {active.route}</span><b>Effort: {active.effort}</b></div>
          <p className="xray-truth"><strong>Illustrative sample.</strong> A real check uses observed answers, exact URLs, dates, and human review.</p>
          <span className="sr-only" aria-live="polite">{announcement}</span>
        </aside>
      </div>
    </section>
  );
}

export function SevenLayerStory() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-story-step]"));
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(() => {
      const center = window.innerHeight * 0.46;
      const closest = nodes
        .map((node) => ({ node, distance: Math.abs(node.getBoundingClientRect().top + node.offsetHeight / 2 - center) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (closest) setActive(Number(closest.node.dataset.storyStep || 0));
    }, { rootMargin: "-12% 0px -35%", threshold: [0, 0.12, 0.3] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function scrollToStep(index: number) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(`[data-story-step="${index}"]`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    setActive(index);
  }

  return (
    <section className="story-experience" aria-labelledby="story-title">
      <div className="story-experience__rail">
        <span className="goat-kicker">Seven connected layers</span>
        <h2 id="story-title">Follow the evidence from question to demand.</h2>
        <div className="story-progress" aria-label={`Step ${active + 1} of 7: ${storySteps[active].label}`}>
          {storySteps.map((step, index) => <button key={step.label} type="button" className={active === index ? "is-active" : ""} aria-current={active === index ? "step" : undefined} onClick={() => scrollToStep(index)}><span>{String(index + 1).padStart(2, "0")}</span>{step.label}</button>)}
        </div>
      </div>
      <div className="story-experience__steps">
        {storySteps.map((step, index) => <article key={step.label} data-story-step={index} className={active === index ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")} / 07</span><h3>{step.title}</h3><p>{step.body}</p><small>{index < 6 ? `${step.label} → ${storySteps[index + 1].label}` : "Evidence → accountable growth signal"}</small></article>)}
      </div>
    </section>
  );
}

