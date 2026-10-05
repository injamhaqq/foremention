import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Use Cases",
  description:
    "Use Foremention to inspect high-intent buyer questions, recommendation evidence, competitor gaps, customer-owned changes, and comparable later observations without turning correlation into causation.",
  path: "/use-cases",
});

const useCases = [
  {
    number: "01",
    title: "See how an important buyer question is answered.",
    trigger: "A category, comparison, security, integration, or use-case question can shape the shortlist.",
    workflow:
      "Version the buyer question, run the approved measurement surface, preserve the observed answer, named brands, returned references, model context, and timestamp as a Recommendation Record.",
    decision:
      "Decide whether the observation is decision-relevant enough to investigate instead of treating one answer as a stable market fact.",
  },
  {
    number: "02",
    title: "Understand a competitor recommendation without guessing why.",
    trigger: "A competitor appears more strongly than your company in an observed answer.",
    workflow:
      "Inspect the answer and returned evidence, then compare those observations with verified Company Truth and eligibility. Keep evidence, inference, and structural product differences separate.",
    decision:
      "Determine whether the gap is controllable, partially controllable, structurally ineligible, contradictory, or still unknown.",
  },
  {
    number: "03",
    title: "Review the sources attached to a recommendation.",
    trigger: "The provider returned references or the measurement path preserved source material.",
    workflow:
      "Keep the returned reference distinct from the source destination, test retrievability, inspect the observed evidence, record human review state, and preserve limitations.",
    decision:
      "Accept, reject, or leave the evidence pending. A returned source never becomes proof that it caused the recommendation.",
  },
  {
    number: "04",
    title: "Turn a real gap into one exact company change.",
    trigger: "Reviewed evidence identifies a customer-owned gap worth considering.",
    workflow:
      "Create a Change Specification that states the proposed change, supporting evidence, owner, acceptance criteria, verification plan, and the option to reject or defer it.",
    decision:
      "A human decides whether to approve, test, reject, monitor, or leave the change unresolved before execution artifacts are created.",
  },
  {
    number: "05",
    title: "Check what changed later without manufacturing causality.",
    trigger: "Your team implemented an approved change and wants to remeasure.",
    workflow:
      "Run a later observation only when the buyer question and material measurement context are comparable. Preserve changed context and mark non-equivalent cycles as not comparable.",
    decision:
      "Record the observed direction and any separately evidenced business outcome without claiming that the company change caused the recommendation movement.",
  },
] as const;

export default function UseCasesPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Use cases</span>
          <h1>Use recommendation evidence to make a better company decision.</h1>
          <p>
            Foremention is most useful when the question is concrete: what did the buyer-facing answer contain,
            what evidence can be inspected, what can your company genuinely change, and what should be measured again later?
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="/#recommendation-record">Explore a sample <Arrow /></Link>
            <Link data-design-partner-cta="use_cases_hero" className="text-link text-link--inverse" href="/contact">Request a pilot <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Five decision workflows</span>
            <h2>Start with a buyer question. End with an inspectable decision.</h2>
            <p>
              These workflows are grounded in the current Foremention product architecture. They do not promise control
              over an AI provider&apos;s rankings, reasoning, personalization, model updates, or future answers.
            </p>
          </div>
          <div className="outreach-stage-list">
            {useCases.map((useCase) => (
              <article key={useCase.number}>
                <span>{useCase.number}</span>
                <h3>{useCase.title}</h3>
                <p><strong>When it matters:</strong> {useCase.trigger}</p>
                <p><strong>What Foremention does:</strong> {useCase.workflow}</p>
                <p><strong>Decision boundary:</strong> {useCase.decision}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--surface">
        <div className="shell split-section">
          <div>
            <span className="eyebrow">Measurement truth</span>
            <h2>Know which AI surface you actually observed.</h2>
          </div>
          <div>
            <p>
              Current free-only collection uses Cloudflare Workers AI with independently retrieved Bing Search RSS sources
              and grounded synthesis. That is a specific measurement surface; it is not direct monitoring of ChatGPT,
              Gemini, or Perplexity consumer applications.
            </p>
            <p>
              Direct provider APIs or additional surfaces should only appear in a customer workflow after their exact
              provenance, rights, cost controls, and comparison rules are independently validated.
            </p>
            <Link className="text-link" href="/methodology">Read the methodology <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div>
            <span className="eyebrow eyebrow--on-ink">The unit of evidence</span>
            <h2>Every use case resolves back to the Recommendation Record.</h2>
          </div>
          <div className="truth-list">
            <div><span>01</span><p><strong>Observed answer.</strong> Preserve what the selected measurement surface actually returned.</p></div>
            <div><span>02</span><p><strong>Evidence state.</strong> Keep returned, retrieved, observed, reviewed, and unknown states distinct.</p></div>
            <div><span>03</span><p><strong>Company decision.</strong> Attach the decision without rewriting the observation that produced it.</p></div>
            <div><span>04</span><p><strong>Later comparison.</strong> Compare only when the material measurement context remains equivalent.</p></div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-band__inner">
          <div>
            <span className="eyebrow">Founder-led pilot</span>
            <h2>Bring five real buyer questions and one decision worth investigating.</h2>
          </div>
          <Link data-design-partner-cta="use_cases_footer" className="button button--ink button--large" href="/contact">Request a pilot <Arrow /></Link>
        </div>
      </section>
    </PublicShell>
  );
}
