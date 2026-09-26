import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B Software",
  description:
    "See how Foremention connects AI recommendation observations to verified company truth, eligibility, exact Change Specifications, execution, and comparable verification.",
  path: "/product",
  markdownPath: "/product.md",
});

const stages = [
  ["01", "Observe", "Record the buyer question, provider context, answer, named vendors, returned references, failures, and timestamp as one dated Recommendation Record."],
  ["02", "Understand", "Review the evidence, Company Truth, eligibility, and cross-business context before treating a recommendation gap as a company problem."],
  ["03", "Decide", "Turn a decision-relevant gap into a Change Specification with the exact change, evidence, owner, acceptance criteria, and verification plan."],
  ["04", "Execute", "Generate or attach execution assets only after human review and record the page, PR, document, ticket, release, policy, product, or other reference the customer actually changed."],
  ["05", "Verify", "Remeasure under comparable conditions and record HIGHER_OBSERVED, LOWER_OBSERVED, MIXED_OBSERVED, NO_DIRECTIONAL_CHANGE, or INSUFFICIENT_EVIDENCE without turning direction into business value or association into a causal claim."],
] as const;

const decisionLayers = [
  ["Company Truth", "What can the company actually prove about its product, pricing, integrations, security, policies, markets, use cases, and evidence?"],
  ["Eligibility", "Can the company genuinely satisfy this buyer requirement, only partly satisfy it, or is it structurally ineligible?"],
  ["Change Specification", "What exact customer-owned company change is worth reviewing, who owns it, and how would the team know it was implemented correctly?"],
  ["Execution", "What did the customer actually change? Foremention records the applied reference rather than assuming a recommendation became reality."],
  ["Verification", "What changed in a later comparable observation, and what remains unknown?"],
] as const;

export default function ProductPage() {
  return (
    <PublicShell>
      <link rel="alternate" type="text/markdown" href="/product.md" />
      <section className="page-hero page-hero--ink outreach-product-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Recommendation Intelligence</span>
          <h1>From recommendation evidence to what your company should change next.</h1>
          <p>
            Foremention starts with a recorded answer from a defined AI measurement method, keeps its evidence
            inspectable, checks what your company can substantiate, and turns a reviewed, decision-relevant gap
            into an exact company change your team can approve, execute, and verify.
          </p>
          <p>
            Current free-only live collection uses Cloudflare Workers AI with Bing Search RSS and grounded
            synthesis. It does not directly monitor ChatGPT, Gemini, or Perplexity consumer-app responses.
          </p>
          <div className="page-hero__actions">
            <Link data-design-partner-cta="product_hero" className="button" href="/contact">Apply as Design Partner <Arrow /></Link>
            <Link className="text-link text-link--inverse" href="/#how-it-works">See how it works <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--paper outreach-product-stages">
        <div className="shell">
          <div className="section-heading">
            <h2>Observe → understand → decide → execute → verify.</h2>
            <p>The product is intentionally not a black-box ranking score. Evidence inspection lives in the record, where each stage keeps the underlying evidence and human decision boundary recoverable. A returned reference does not by itself establish a causal explanation.</p>
          </div>
          <div className="outreach-stage-list">
            {stages.map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section section--surface outreach-product-decisions">
        <div className="shell">
          <div className="section-heading">
            <h2>The decision layers that make “what should we change?” defensible.</h2>
            <p>Observation alone is not enough. Foremention keeps company facts, structural eligibility, the human-reviewed decision, execution, and later verification distinct.</p>
          </div>
          <div className="outreach-decision-list">
            {decisionLayers.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div><h2>Foremention is built to say “not enough evidence” or “do not do it.”</h2></div>
          <div className="truth-list">
            <div><span>01</span><p><strong>No ranking guarantees.</strong> An observed recommendation is not a promise that Foremention can control an AI provider&apos;s future answer.</p></div>
            <div><span>02</span><p><strong>No fake composite certainty.</strong> Control, eligibility, confidence, evidence, effort, and decision state remain visible separately.</p></div>
            <div><span>03</span><p><strong>No automatic company decision.</strong> Human approval remains required for material changes.</p></div>
            <div><span>04</span><p><strong>No causal shortcut.</strong> Before-and-after association remains distinct from proof that a company change caused the result.</p></div>
          </div>
        </div>
      </section>

      <section className="section section--surface">
        <div className="shell narrow-heading">
          <h2>Know exactly which AI surface was observed.</h2>
          <p>
            A Cloudflare-hosted grounded answer with independently retrieved Bing RSS sources is a specific
            measurement, not a native observation of a competing AI assistant's consumer interface. A separate
            provider API may also behave differently from its consumer application.
          </p>
          <p>
            Foremention retains the observed provider, exact model, buyer-question version, retrieval method
            and material measurement context. Other provider surfaces are not promised or compared until
            they are independently validated with genuine provider-returned evidence.
          </p>
        </div>
      </section>

      <section className="cta-band outreach-product-cta">
        <div className="shell cta-band__inner">
          <div><span className="eyebrow">Founder-led design partner</span><h2>Bring five buyer questions. Test one real company-change cycle.</h2></div>
          <Link data-design-partner-cta="product_bottom" className="button button--ink button--large" href="/contact">Apply as Design Partner <Arrow /></Link>
        </div>
      </section>
    </PublicShell>
  );
}
