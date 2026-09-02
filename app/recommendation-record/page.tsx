import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Record",
  description:
    "A Foremention Recommendation Record is the canonical, inspectable record of one AI recommendation observation: question identity, provider/model, answer, named brands, returned references, source retrieval, review state, limitations, and comparison eligibility.",
  path: "/recommendation-record",
});

const fields = [
  ["Record identity", "Immutable record ID, buyer-question identity and question version."],
  ["Observation context", "Provider/model metadata and the timestamp of the observed answer."],
  ["Observed answer", "The answer text and the vendors that were named or recommended."],
  ["Returned references", "References the provider returned with the answer, kept as returned evidence."],
  ["Distinct sources", "Deduplicated source destinations and whether each could actually be retrieved."],
  ["Review state", "What has been reviewed, what remains pending, and the human decision boundary."],
  ["Limitations", "What the observation does not establish, including causal limits and missing evidence."],
  ["Comparison eligibility", "Whether a later observation can be validly aligned under an equivalent measurement protocol."],
] as const;

const inspectionStages = [
  ["Returned", "What reference or source location did the provider return with the observed answer?"],
  ["Retrieved", "Could Foremention retrieve the returned destination, or was it unavailable at review time?"],
  ["Observed", "What relevant evidence was actually present in the retrievable source?"],
  ["Reviewed", "What did a human inspect, accept, reject, or leave pending?"],
  ["Safe conclusion", "What conclusion is supported by this record, and which claims remain unproven?"],
] as const;

export default function RecommendationRecordPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Foremention", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Recommendation Record", item: `${SITE_URL}/recommendation-record` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">The canonical product object</span>
          <h1>Recommendation Record.</h1>
          <p>
            One AI recommendation observation becomes one canonical record. The record keeps the
            question, provider context, observed answer, references, source retrieval, review state,
            limitations and later-comparison eligibility together instead of flattening them into a score.
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="#evidence-inspection">Inspect the evidence chain <Arrow /></Link>
            <Link data-design-partner-cta="record_hero" className="text-link text-link--inverse" href="/contact">Apply as a Design Partner <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">What the record preserves</span>
            <h2>Inspect the observation without losing its evidence boundary.</h2>
            <p>
              The exact stored fields depend on the provider and collection path, but the product
              architecture keeps observation, evidence, review and comparison state distinct.
            </p>
          </div>
          <div className="system-grid">
            {fields.map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--surface" id="evidence-inspection">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Evidence inspection inside the record</span>
            <h2>Returned → Retrieved → Observed → Reviewed → Safe conclusion.</h2>
            <p>Each stage answers a different question. Keeping them inside the Recommendation Record prevents returned references, retrieved sources, observed evidence, and human review from being collapsed into one claim.</p>
          </div>
          <div className="system-grid">
            {inspectionStages.map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell metric-layers">
          <div><span className="eyebrow">Illustrative record logic</span><h2>RR-2026-08-26-017 · Q-017 v3 · review pending.</h2></div>
          <div><h3>Observed</h3><p>Vendor A was recommended. Vendor B and Vendor C were also named. Three references were returned.</p></div>
          <div><h3>Retrieved</h3><p>Two distinct source destinations were retrievable. One returned reference was unavailable.</p></div>
          <div><h3>Safe conclusion</h3><p>The returned references do not establish causal influence on the recommendation, and one observation does not establish a trend.</p></div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div><span className="eyebrow eyebrow--on-ink">Why it matters</span><h2>A record can be challenged, reviewed, shared and compared.</h2></div>
          <div className="truth-list">
            <div><span>01</span><p><strong>Immutable identity.</strong> A changed buyer question creates a new version instead of silently rewriting history.</p></div>
            <div><span>02</span><p><strong>Source separation.</strong> Returned references and distinct retrievable sources remain separate concepts.</p></div>
            <div><span>03</span><p><strong>Comparison gate.</strong> Comparison eligibility is explicit: a later observation is marked not comparable when the measurement protocol is not equivalent.</p></div>
          </div>
        </div>
      </section>

      <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">One measurable cycle</span><h2>Bring five buyer questions, review the evidence, choose one company change, and return for comparable remeasurement.</h2></div><Link data-design-partner-cta="record_bottom" className="button button--ink button--large" href="/contact">Apply as a Design Partner <Arrow /></Link></div></section>
    </PublicShell>
  );
}
