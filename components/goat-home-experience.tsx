"use client";

import Link from "next/link";
import { Arrow } from "@/components/brand";
import { CanonicalSignalField } from "@/components/canonical-signal-field";

const workflow = [
  ["01", "Buyer question", "Start with a real question that can determine the shortlist."],
  ["02", "Recommendation observation", "Preserve what the provider actually returned, including named vendors and context."],
  ["03", "Evidence", "Keep returned references, retrievability, review state, and uncertainty attached to the observation."],
  ["04", "Company Truth", "Separate what your company can actually prove from what it merely wants to claim."],
  ["05", "Eligibility", "Determine whether the buyer requirement is eligible, partially eligible, structurally ineligible, or still unknown."],
  ["06", "Change Specification", "Turn the gap into an exact customer-owned company change with evidence, acceptance criteria, and a verification plan."],
  ["07", "Human approval", "A person decides whether the change should be approved, tested, rejected, monitored, or left unresolved."],
  ["08", "Execution", "Record what the customer actually changed instead of pretending a recommendation was implemented."],
  ["09", "Comparable remeasurement", "Measure later only when the buyer question and relevant conditions remain comparable."],
  ["10", "Learning", "Record the observed association and business outcome without manufacturing causality."],
] as const;

const partnerSteps = [
  ["01", "Bring 5 important buyer questions", "Choose the questions that genuinely affect your category or shortlist."],
  ["02", "Establish the baseline", "Create dated Recommendation Records for the approved scope."],
  ["03", "Review the evidence", "Inspect what came back, what is supportable, and what remains uncertain."],
  ["04", "Choose one company change", "Translate the strongest decision-relevant gap into an exact Change Specification."],
  ["05", "Implement what you approve", "Your team stays in control of the decision and the execution."],
  ["06", "Remeasure comparably", "Return under equivalent conditions and record what changed — or did not."],
] as const;

const recordStates = [
  ["ANSWER", "Observed", "Provider response preserved.", ""],
  ["REFERENCE", "Returned", "Returned reference recorded.", ""],
  ["SOURCE", "Retrievable", "Public source can be inspected.", ""],
  ["REVIEW", "Pending", "Human verification remains open.", "is-pending"],
] as const;

const recordChain = [
  ["RETURNED", "is-complete"],
  ["RETRIEVED", "is-complete"],
  ["OBSERVED", "is-complete"],
  ["REVIEWED", "is-pending"],
  ["SAFE CONCLUSION", "is-withheld"],
] as const;

const changeDefinitionLabelStyle = { color: "#666460" } as const;

export function MissingAnswerExperience() {
  return <div className="outreach-home">
    <section className="outreach-hero shell" aria-labelledby="outreach-hero-title">
      <div className="outreach-hero__copy">
        <h1 id="outreach-hero-title">Know what your company should change next to become the stronger recommendation.</h1>
        <p className="outreach-hero__lead">Recommendation intelligence for B2B software. Foremention observes how AI systems answer your buyers&apos; questions, verifies the evidence behind those recommendations, separates controllable gaps from structural ones, and turns the result into exact company changes your team can review and verify.</p>
        <div className="outreach-hero__actions">
          <Link data-design-partner-cta="home_hero" className="canonical-button canonical-button--primary" href="/contact">Apply as a Design Partner <Arrow /></Link>
          <Link className="canonical-button canonical-button--secondary" href="/#how-it-works">See how it works <Arrow /></Link>
          <Link className="canonical-button canonical-button--secondary" href="#recommendation-record">Inspect a Recommendation Record <Arrow /></Link>
        </div>
        <p className="outreach-hero__boundary">No fake reviews. No hidden promotion. No ranking guarantees. No fabricated scores. No causal claims without evidence.</p>
      </div>
      <div className="outreach-hero__visual"><CanonicalSignalField compact /></div>
    </section>

    <div className="shell">
      <section className="canonical-record" id="recommendation-record" aria-labelledby="outreach-record-title">
        <div className="canonical-record__eyebrow">LIVE RECORD / ILLUSTRATIVE</div>
        <div className="canonical-record__heading">
          <div>
            <span>RECOMMENDATION RECORD</span>
            <h2 id="outreach-record-title">“What is the best platform for enterprise product marketing?”</h2>
          </div>
          <dl className="canonical-record__meta">
            <div><dt>TYPE</dt><dd>Illustrative</dd></div>
            <div><dt>STATE</dt><dd>Review pending</dd></div>
          </dl>
        </div>
        <dl className="canonical-record__states">
          {recordStates.map(([label, state, detail, className]) => <div key={label} className={className || undefined}><dt>{label}</dt><dd><span>{state}</span><small>{detail}</small></dd></div>)}
        </dl>
        <div className="canonical-record__chain" aria-label="Evidence chain: returned, retrieved, observed, reviewed, safe conclusion">
          {recordChain.map(([label, state], index) => <div key={label} className={state}><span aria-hidden="true" /><strong>{label}</strong>{index < recordChain.length - 1 ? <i aria-hidden="true" /> : null}</div>)}
        </div>
        <div className="canonical-record__actions">
          <Link className="canonical-record__inspect" href="/recommendation-record">Inspect evidence <span aria-hidden="true">→</span></Link>
          <Link className="canonical-record__inspect" href="/methodology">Read methodology <span aria-hidden="true">→</span></Link>
        </div>
        <div className="canonical-record__boundary">
          <span>CAUSAL RESTRAINT</span>
          <p>A returned or reviewed source does not, by itself, prove that the source caused the recommendation.</p>
        </div>
      </section>

      <section className="canonical-foundation registered-foundation" aria-labelledby="outreach-foundation-title">
        <span className="canonical-kicker">FROM OBSERVATION TO INSPECTABLE RECORD</span>
        <h2 id="outreach-foundation-title">The recommendation is only the start.</h2>
        <p>Foremention keeps returned references, distinct sources, retrievability, review state, and later comparison eligibility together so the evidence remains inspectable before a company decision is made.</p>
        <div className="canonical-foundation__grid">
          <article><span>01</span><h3>Recommendation Record</h3><p>A canonical, timestamped observation — not a generic score.</p></article>
          <article><span>02</span><h3>Evidence inspection</h3><p>Inspect what came back, what was retrievable, what was reviewed, and what remains uncertain inside the record.</p></article>
          <article><span>03</span><h3>Comparable later measurement</h3><p>Track change only when the later observation is actually comparable.</p></article>
        </div>
      </section>
    </div>

    <section className="outreach-problem" aria-labelledby="outreach-problem-title">
      <div className="shell">
        <div className="outreach-section-heading outreach-section-heading--paper">
          <h2 id="outreach-problem-title">Why are competitors being recommended — and what should you actually do about it?</h2>
          <p>A recommendation observation is useful only when it can become a defensible company decision.</p>
        </div>
        <div className="outreach-problem__rail">
          <article><span>OBSERVED</span><h3>See what the buyer-facing AI answer actually contains.</h3><p>Foremention preserves the question, provider context, answer, competitors, returned references, and review state instead of reducing everything to one visibility score.</p></article>
          <article><span>DIAGNOSED</span><h3>Separate evidence from explanation.</h3><p>Company Truth, eligibility, and cross-business evidence help distinguish a communication gap from a product, proof, pricing, policy, or structural gap.</p></article>
          <article><span>ACTIONABLE</span><h3>Turn the strongest gap into an exact company change.</h3><p>The output is a human-reviewed Change Specification with an owner, acceptance criteria, evidence, and a verification plan — including the option to do nothing.</p></article>
        </div>
      </div>
    </section>

    <section className="outreach-workflow" id="how-it-works" aria-labelledby="outreach-workflow-title">
      <div className="shell">
        <div className="outreach-section-heading">
          <h2 id="outreach-workflow-title">From buyer question to a company change you can verify.</h2>
          <p>Foremention keeps the evidence chain and the company-decision chain connected without pretending that one caused the other.</p>
        </div>
        <ol className="outreach-workflow__list">
          {workflow.map(([number, title, body]) => <li key={number}><span className="outreach-workflow__number">{number}</span><strong>{title}</strong><p>{body}</p></li>)}
        </ol>
      </div>
    </section>

    <section className="outreach-change" aria-labelledby="outreach-change-title">
      <div className="shell outreach-change__layout">
        <div className="outreach-section-heading">
          <h2 id="outreach-change-title">The recommendation is not the product. The company change is where the value starts.</h2>
          <p>This illustrative example shows the kind of decision object Foremention is designed to produce. It is not a customer result or benchmark.</p>
        </div>
        <article className="outreach-change__record" aria-label="Illustrative next company change">
          <header><span>NEXT COMPANY CHANGE</span><strong>Improve enterprise security proof</strong></header>
          <dl>
            <div><dt style={changeDefinitionLabelStyle}>Why</dt><dd>Evidence indicates that enterprise-security requirements are easier to verify for stronger recommended alternatives.</dd></div>
            <div><dt style={changeDefinitionLabelStyle}>Control</dt><dd>CONTROLLABLE</dd></div>
            <div><dt style={changeDefinitionLabelStyle}>Eligibility</dt><dd>PARTIALLY ELIGIBLE</dd></div>
            <div><dt style={changeDefinitionLabelStyle}>Confidence</dt><dd>MEDIUM</dd></div>
            <div><dt style={changeDefinitionLabelStyle}>Decision</dt><dd>TEST FIRST</dd></div>
            <div className="outreach-change__wide"><dt style={changeDefinitionLabelStyle}>Exact change</dt><dd>Publish an approved security overview that makes already-verified SSO, audit-log, data-retention, and access-control capabilities easier for buyers to substantiate.</dd></div>
            <div className="outreach-change__wide"><dt style={changeDefinitionLabelStyle}>Acceptance criteria</dt><dd>Every included claim is internally approved and publicly verifiable from the referenced evidence.</dd></div>
            <div className="outreach-change__wide"><dt style={changeDefinitionLabelStyle}>Verification</dt><dd>Repeat the equivalent buyer-question measurement after implementation and record only the observed before-and-after association.</dd></div>
          </dl>
          <footer>Illustrative example — not customer evidence.</footer>
        </article>
      </div>
    </section>

    <section className="outreach-truth" aria-labelledby="outreach-truth-title">
      <div className="shell">
        <div className="outreach-section-heading outreach-section-heading--paper">
          <h2 id="outreach-truth-title">Foremention starts with what your company can actually prove.</h2>
          <p>A good recommendation should never tell your company to make a claim it cannot substantiate.</p>
        </div>
        <div className="outreach-truth__split">
          <article>
            <h3>Company Truth</h3>
            <p>Keep verified facts about product capabilities, integrations, pricing and packaging, security, markets, policies, use cases, and proof attached to their sources and verification state.</p>
            <ul><li>Verified facts stay distinct from hypotheses.</li><li>Evidence can expire or be superseded.</li><li>Customer truth remains tenant-scoped.</li></ul>
          </article>
          <article>
            <h3>Sometimes the right answer is: do not do it.</h3>
            <p>Eligibility prevents Foremention from manufacturing marketing work for a requirement the company cannot genuinely satisfy.</p>
            <div className="outreach-eligibility" aria-label="Eligibility states"><span>ELIGIBLE</span><span>PARTIALLY ELIGIBLE</span><span>STRUCTURALLY INELIGIBLE</span><span>UNKNOWN</span></div>
          </article>
        </div>
      </div>
    </section>

    <section className="outreach-partner" aria-labelledby="outreach-partner-title">
      <div className="shell">
        <div className="outreach-partner__intro">
          <div className="outreach-section-heading">
            <h2 id="outreach-partner-title">Become a Foremention Design Partner.</h2>
            <p>Use one real B2B software category, five buyer questions, and one measurable company-change cycle. Founder-led by design while the workflow is being validated with real teams.</p>
          </div>
          <Link data-design-partner-cta="home_partner" className="canonical-button canonical-button--primary" href="/contact">Apply as a Design Partner <Arrow /></Link>
        </div>
        <ol className="outreach-partner__steps">
          {partnerSteps.map(([number, title, body]) => <li key={number}><span>{number}</span><strong>{title}</strong><p>{body}</p></li>)}
        </ol>
        <p className="outreach-partner__fineprint">Founder-led. Limited scope. Applying does not create a paid subscription, guarantee an outcome, or authorize a company change.</p>
      </div>
    </section>
  </div>;
}
