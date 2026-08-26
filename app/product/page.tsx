import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B Software",
  description:
    "Explore Foremention Recommendation Records, Source X-Ray, buyer questions, review state, competitor context, and comparable later measurement for AI-mediated software buying.",
  path: "/product",
});

const systems = [
  [
    "01",
    "Recommendation Record",
    "Keeps the buyer question, provider/model, timestamp, observed answer, named brands, returned references, distinct sources, retrievability, review state, limitations, and comparison eligibility together as one inspectable record.",
  ],
  [
    "02",
    "Source X-Ray",
    "Shows what the provider returned, what could be retrieved, what evidence was actually observed, what a human reviewed, what remains uncertain, and what can safely be concluded.",
  ],
  [
    "03",
    "Buyer Questions",
    "Organizes the real questions software buyers may ask so observations remain tied to a stable question identity and version instead of a vague visibility score.",
  ],
  [
    "04",
    "Attention",
    "Surfaces what changed or requires review: a new recommendation, changed source, insufficient evidence, or a later observation that is finally comparable.",
  ],
  [
    "05",
    "Comparisons",
    "Aligns later observations only when the measurement is equivalent. If the question, provider context, or protocol is not comparable, Foremention keeps the misalignment visible.",
  ],
  [
    "06",
    "Methodology",
    "Preserves provider metadata, timestamps, failed runs, repeated sampling, source provenance, review state, uncertainty, and explicit causal limits so one observation never masquerades as a trend.",
  ],
];

export default function ProductPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Recommendation Intelligence</span>
          <h1>Make AI software recommendations inspectable.</h1>
          <p>
            Foremention records the recommendation observations AI-mediated buyers may see,
            preserves the returned references and distinct sources that accompanied them,
            keeps review and uncertainty explicit, and helps teams decide what they can safely act on.
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="/recommendation-record">
              See a Recommendation Record <Arrow />
            </Link>
            <Link className="text-link text-link--inverse" href="/contact">
              Request a demo <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">The defining objects</span>
            <h2>From buyer question to inspectable recommendation evidence.</h2>
            <p>
              The product is designed around records and evidence states rather than a single
              composite visibility score. Returned references stay separate from distinct
              retrievable sources, and a returned reference is never treated as causal proof.
            </p>
          </div>
          <div className="system-grid">
            {systems.map(([n, title, body]) => (
              <article key={n}>
                <span>{n}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="goat-xray-section goat-xray-section--product">
        <div className="shell">
          <SourceXRayExperience />
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell metric-layers">
          <div>
            <span className="eyebrow">The intelligence chain</span>
            <h2>Buyer question → observation → evidence → review → decision → later comparison.</h2>
          </div>
          <div>
            <h3>Observe</h3>
            <p>What did the provider answer, which vendors were named, and what references were returned?</p>
          </div>
          <div>
            <h3>Inspect</h3>
            <p>Which sources were distinct and retrievable, what evidence was observed, and what remains uncertain?</p>
          </div>
          <div>
            <h3>Compare carefully</h3>
            <p>Did an equivalent later observation change, or are the two measurements not actually comparable?</p>
          </div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div>
            <span className="eyebrow eyebrow--on-ink">Epistemic restraint</span>
            <h2>Foremention shows the boundary of the evidence.</h2>
          </div>
          <div className="truth-list">
            <div>
              <span>01</span>
              <p><strong>One observation is not a trend.</strong> Repeated, comparable measurement is required before claiming stable movement.</p>
            </div>
            <div>
              <span>02</span>
              <p><strong>A returned source is not causal proof.</strong> It records what accompanied the answer, not necessarily what caused the recommendation.</p>
            </div>
            <div>
              <span>03</span>
              <p><strong>Missing evidence stays missing.</strong> Unavailable sources, failed runs, uncertainty, and invalid comparisons remain visible.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-band__inner">
          <div>
            <span className="eyebrow">Register. Prove. Prepare.</span>
            <h2>Inspect what can actually be substantiated before you act.</h2>
          </div>
          <Link className="button button--ink button--large" href="/contact">
            Request a demo <Arrow />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
