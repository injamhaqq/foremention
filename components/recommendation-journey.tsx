"use client";

import { useMemo, useState } from "react";

const stages = [
  { key: "prompt", label: "Buyer prompt", title: "Best HR platform for a 200-person remote team?", note: "A high-intent category question enters the answer layer." },
  { key: "answer", label: "Recommendation", title: "Deel · Rippling · HiBob", note: "Three established competitors are shortlisted. The sample company is absent." },
  { key: "source", label: "Deciding source", title: "remoteworklab.com/guides/hr-platforms", note: "This exact page recurs across the sampled answers." },
  { key: "gap", label: "Competitor gap", title: "3 competitors present · Northstar HR absent", note: "The gap is stored at URL level, not reduced to a visibility score." },
  { key: "route", label: "Placement route", title: "Evidence-led editorial outreach", note: "A qualified route exists; publication remains the editor’s decision." },
  { key: "citation", label: "Citation watch", title: "Published → indexed → observed", note: "The system checks the placement after publication without claiming causation." },
  { key: "pipeline", label: "Pipeline signal", title: "AI referral → qualified demo", note: "Referral and CRM evidence are connected conservatively when access exists." },
] as const;

export function RecommendationJourney() {
  const [active, setActive] = useState(0);
  const [domain, setDomain] = useState("northstarhr.example");
  const company = useMemo(() => domain.replace(/^https?:\/\//, "").split(".")[0].replace(/[-_]/g, " ") || "your company", [domain]);

  return (
    <section className="journey" aria-labelledby="journey-title">
      <div className="journey__topline">
        <div>
          <span className="eyebrow eyebrow--dark">Interactive recommendation trail</span>
          <h2 id="journey-title">See the answer become an action.</h2>
        </div>
        <label className="journey__personalize">
          <span>Personalize the example</span>
          <input aria-label="Company domain for example" value={domain} onChange={(event) => setDomain(event.target.value)} />
        </label>
      </div>

      <div className="journey__stage" aria-live="polite">
        <div className="journey__trace" aria-hidden="true">
          <span>Prompt</span><i /><span>Answer</span><i /><span>Source</span><i /><span>Action</span>
        </div>
        <div className="journey__card journey__card--prompt">
          <small>Buyer asks</small>
          <strong>“What is the best HR platform for a 200-person remote team?”</strong>
        </div>
        <div className="journey__answer">
          <span className="journey__answer-label">Sample answer</span>
          <div className="recommendation-pills"><b>Deel</b><b>Rippling</b><b>HiBob</b></div>
          <p><mark>{company}</mark> is not in the shortlist.</p>
        </div>
        <div className="journey__source-card">
          <span>Recurring citation · observed 18×</span>
          <strong>remoteworklab.com</strong>
          <small>The 12 best HR platforms for distributed teams</small>
          <div className="journey__source-meta"><span>Competitors: 3</span><span>You: absent</span><span>Crawler: open</span></div>
        </div>
        <div className="journey__action-card">
          <span>Qualified route</span>
          <strong>Editorial inclusion</strong>
          <small>Evidence brief → author review → publication decision</small>
        </div>
      </div>

      <div className="journey__controls" role="tablist" aria-label="Recommendation journey stages">
        {stages.map((stage, index) => (
          <button
            className={active === index ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls="journey-detail"
            key={stage.key}
            onClick={() => setActive(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>{stage.label}
          </button>
        ))}
      </div>
      <div className="journey__detail" id="journey-detail" role="tabpanel">
        <span>{stages[active].label}</span>
        <strong>{stages[active].title.replace("Northstar HR", company)}</strong>
        <p>{stages[active].note}</p>
      </div>
      <p className="journey__disclosure">Illustrative demo using fictional sample data. It is not a completed analysis of the domain entered above.</p>
    </section>
  );
}
