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
    <section className="fm-cinematic-hero" aria-labelledby="fm-cinematic-hero-title">
      <div className="shell fm-cinematic-hero__inner">
        <div className="fm-cinematic-hero__copy">
          <span className="fm-cinematic-hero__kicker">RECOMMENDATION INTELLIGENCE FOR B2B SOFTWARE</span>
          <h1 id="fm-cinematic-hero-title">See where AI recommends your brand.</h1>
          <p className="fm-cinematic-hero__lead">Track recommendations, inspect supporting sources, and decide what to improve.</p>
          <div className="fm-cinematic-hero__actions">
            <Link data-public-sample-open className="canonical-button canonical-button--primary" href="#recommendation-record">Explore a sample <Arrow /></Link>
            <Link data-design-partner-cta="home_hero" className="canonical-button canonical-button--secondary" href="/contact">Request a pilot <Arrow /></Link>
          </div>
          <p className="fm-cinematic-hero__boundary">Illustrative, versioned sample data. Opening this page does not trigger paid research or expose customer records.</p>
        </div>

        <div className="fm-recommendation-graph" aria-label="Illustrative recommendation graph connecting one buyer question to an observed answer, recommended brands, returned sources, and an inspectable Recommendation Record">
          <div className="fm-recommendation-graph__label"><span>ILLUSTRATIVE SIGNAL MAP</span><strong>Question → answer → brands → sources</strong></div>
          <svg className="fm-recommendation-graph__lines" viewBox="0 0 760 620" aria-hidden="true" preserveAspectRatio="none">
            <path d="M130 310 C230 310 220 190 330 190" />
            <path d="M130 310 C230 310 220 420 330 420" />
            <path d="M430 190 C525 190 520 118 635 118" />
            <path d="M430 190 C525 190 520 265 635 265" />
            <path d="M430 420 C525 420 520 355 635 355" />
            <path d="M430 420 C525 420 520 505 635 505" />
          </svg>

          <div className="fm-graph-node fm-graph-node--question">
            <span>BUYER QUESTION</span>
            <strong>Best platform for enterprise product marketing?</strong>
            <small>Priority question · demonstration</small>
          </div>
          <div className="fm-graph-node fm-graph-node--answer">
            <span>OBSERVED ANSWER</span>
            <strong>Provider response preserved</strong>
            <small>Timestamp + model provenance attached</small>
          </div>
          <div className="fm-graph-node fm-graph-node--brand">
            <span>RECOMMENDED BRAND</span>
            <strong>Competitor A</strong>
            <small>Observed in this sample answer</small>
          </div>
          <div className="fm-graph-node fm-graph-node--brand-secondary">
            <span>YOUR BRAND</span>
            <strong>Present, not top-listed</strong>
            <small>Illustrative state only</small>
          </div>
          <div className="fm-graph-node fm-graph-node--source-a">
            <span>RETURNED SOURCE</span>
            <strong>Source 01</strong>
            <small>Retrievable · review pending</small>
          </div>
          <div className="fm-graph-node fm-graph-node--source-b">
            <span>RETURNED SOURCE</span>
            <strong>Source 02</strong>
            <small>Retrievable · review pending</small>
          </div>

          <Link data-public-sample-open className="fm-graph-record" href="#recommendation-record" aria-label="Inspect the illustrative Recommendation Record">
            <span>RECOMMENDATION RECORD / 01</span>
            <strong>Observed evidence, held together.</strong>
            <small>Answer · brands · sources · review state · limitations <b aria-hidden="true">→</b></small>
          </Link>

          <ol className="sr-only">
            <li>One illustrative buyer question is measured.</li>
            <li>The provider answer is preserved with provenance.</li>
            <li>Observed brand recommendations remain attached to that answer.</li>
            <li>Returned sources remain distinct and inspectable.</li>
            <li>The evidence resolves into one sample Recommendation Record.</li>
          </ol>
        </div>
      </div>
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
          <Link data-public-evidence-inspect className="canonical-record__inspect" href="/recommendation-record">Inspect evidence <span aria-hidden="true">→</span></Link>
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

    <section className="fm-home-proof" aria-labelledby="fm-home-proof-title">
      <div className="shell fm-home-proof__layout">
        <div className="fm-home-proof__intro">
          <span className="canonical-kicker">PROOF WITHOUT PLACEHOLDERS</span>
          <h2 id="fm-home-proof-title">Credibility should appear only after the evidence exists.</h2>
          <p>Foremention does not publish invented customer logos, uplift percentages, security badges, or outcome claims to make the site look mature. Public proof is added only when it is consented, attributable, and supported by the underlying record.</p>
        </div>
        <div className="fm-home-proof__grid">
          <article>
            <span>01</span>
            <strong>Methodology is inspectable now.</strong>
            <p>See how question versions, provider context, returned references, review state, uncertainty, and later comparability are separated.</p>
            <Link className="text-link" href="/methodology">Read methodology <Arrow /></Link>
          </article>
          <article>
            <span>02</span>
            <strong>Trust claims stay current.</strong>
            <p>Security, privacy, tenant isolation, provider handling, and unavailable controls are described as implemented, configuration-required, architecture-ready, or unavailable.</p>
            <Link className="text-link" href="/trust">Open Trust Center <Arrow /></Link>
          </article>
          <article>
            <span>03</span>
            <strong>Customer proof waits for customer proof.</strong>
            <p>No design-partner application, demo workspace, internal test, or fictional sample is presented as a customer result.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="fm-home-faq" aria-labelledby="fm-home-faq-title">
      <div className="shell fm-home-faq__layout">
        <div>
          <span className="canonical-kicker">PRACTICAL QUESTIONS</span>
          <h2 id="fm-home-faq-title">What teams usually need to know before a pilot.</h2>
          <p>These answers describe the current product boundary rather than a future roadmap claim.</p>
        </div>
        <div className="fm-home-faq__items">
          <details>
            <summary>Does Foremention guarantee that my brand will be recommended?</summary>
            <p>No. Foremention records observations, inspects evidence, helps identify company-owned changes worth testing, and supports comparable later measurement. It does not control an AI provider&apos;s ranking, model weights, personalization, updates, or future answers.</p>
          </details>
          <details>
            <summary>Which AI surface is measured today?</summary>
            <p>Current free-only live collection uses Cloudflare Workers AI with independently retrieved Bing Search RSS sources and grounded synthesis. That is not direct monitoring of ChatGPT, Gemini, or Perplexity consumer applications.</p>
          </details>
          <details>
            <summary>Does opening the homepage run paid AI research?</summary>
            <p>No. The public sample is sanitized and versioned. It does not call a paid provider, create a customer run, or expose customer records when the page loads.</p>
          </details>
          <details>
            <summary>What makes a later observation comparable?</summary>
            <p>The buyer-question version, provider/model context, collection method, and other material measurement conditions must remain equivalent enough for comparison. Material drift is recorded as not comparable instead of being forced into a trend.</p>
          </details>
          <details>
            <summary>What happens in the founder-led pilot?</summary>
            <p>Bring up to five priority buyer questions, establish a baseline, review the evidence, choose one customer-owned company change worth testing, implement only what your team approves, and return for comparable remeasurement.</p>
          </details>
          <details>
            <summary>What happens to the information I submit?</summary>
            <p>The public application collects only the information needed to evaluate the pilot conversation. The intake is validated, rate-limited, persisted server-side, and does not create a paid subscription or authorize automated collection.</p>
          </details>
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
          <Link data-design-partner-cta="home_partner" className="canonical-button canonical-button--primary" href="/contact">Apply as Design Partner <Arrow /></Link>
        </div>
        <ol className="outreach-partner__steps">
          {partnerSteps.map(([number, title, body]) => <li key={number}><span>{number}</span><strong>{title}</strong><p>{body}</p></li>)}
        </ol>
        <p className="outreach-partner__fineprint">Founder-led. Limited scope. Applying does not create a paid subscription, guarantee an outcome, or authorize a company change.</p>
      </div>
    </section>
  </div>;
}
