import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Methodology",
  description:
    "How Foremention versions buyer questions, records provider/model context, preserves recommendation observations and returned references, reviews retrievable evidence, handles uncertainty, and gates comparable later measurement.",
  path: "/methodology",
});

const steps = [
  ["01", "Define and version the buyer question", "Fix the category, buyer stage, geography, brands, and buyer question before collection. If the question materially changes, create a new version instead of silently rewriting measurement history."],
  ["02", "Record the provider observation", "Store the provider/model context, collection timestamp, observed answer, named or recommended brands, and returned references when the provider supplies them."],
  ["03", "Separate returned references from distinct sources", "Preserve what the provider returned, normalize source destinations carefully, deduplicate distinct sources without collapsing genuinely different pages, and keep missing references missing."],
  ["04", "Test retrievability", "Record whether each returned destination can actually be retrieved. Retrieval is an observed state; it is not the same as relevance, human review, or causal influence."],
  ["05", "Inspect the evidence", "Evidence inspection inside the Recommendation Record distinguishes what was returned, what was retrieved, what evidence was observed, what a human reviewed, and what remains uncertain."],
  ["06", "Keep causal restraint explicit", "A returned source can accompany an answer without Foremention claiming that the source caused the recommendation. The product preserves that boundary in the record and the interface."],
  ["07", "Review before stronger conclusions", "Human review can accept, reject, or leave evidence pending. Insufficient, contradictory, unavailable, and unknown states remain visible instead of becoming a reassuring composite score."],
  ["08", "Compare only equivalent later observations", "A later observation is aligned only when the question version, provider context, collection protocol and other material measurement conditions are equivalent. Otherwise it is marked not comparable."],
  ["09", "Keep outcomes separate from observations", "A later recommendation change is an observation. Business outcomes or causal impact require their own evidence and must not be inferred from movement alone."],
] as const;

export default function MethodologyPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink">
      <div className="shell narrow-heading">
        <span className="eyebrow eyebrow--on-ink">Recommendation Intelligence methodology</span>
        <h1>Every conclusion should survive inspection.</h1>
        <p>
          Foremention separates the observed recommendation, returned references, distinct sources,
          retrievability, evidence, human review, comparison eligibility and later outcomes so one layer
          cannot quietly impersonate another.
        </p>
        <div className="page-hero__actions">
          <Link className="button" href="/recommendation-record">Explore evidence inspection <Arrow /></Link>
          <Link className="text-link text-link--inverse" href="/recommendation-record">Recommendation Record <Arrow /></Link>
        </div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="shell honesty-intro">
        <span>The operating sequence</span>
        <p>Buyer question → provider observation → returned reference → distinct source → retrievability → evidence → human review → decision → comparable later measurement.</p>
      </div>
      <div className="shell method-grid">
        {steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}
      </div>
    </section>

    <section className="section section--yellow">
      <div className="shell metric-layers">
        <div><span className="eyebrow">Measurement discipline</span><h2>One observation is not a stable pattern.</h2></div>
        <div><h3>Sampling</h3><p>Repeated sampling, failed runs, provider variance and temporal variance remain part of the evidence record where available.</p></div>
        <div><h3>Provenance</h3><p>Question identity, provider/model metadata, timestamps, returned references, source retrieval and review state remain inspectable.</p></div>
        <div><h3>Comparison</h3><p>Foremention aligns later observations only when the measurement is equivalent enough to support comparison.</p></div>
      </div>
    </section>

    <section className="section section--ink">
      <div className="shell split-section">
        <div><span className="eyebrow eyebrow--on-ink">Register. Prove. Prepare.</span><h2>“Prove” means inspect what can actually be substantiated.</h2></div>
        <div className="truth-list">
          <div><span>01</span><p><strong>Register.</strong> Capture the recommendation observation and its context.</p></div>
          <div><span>02</span><p><strong>Prove.</strong> Inspect what the evidence can support—and what it cannot.</p></div>
          <div><span>03</span><p><strong>Prepare.</strong> Turn the reviewed intelligence into the next decision or action without overstating certainty.</p></div>
        </div>
      </div>
    </section>
  </PublicShell>;
}
