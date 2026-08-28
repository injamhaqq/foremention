import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B Software",
  description:
    "Recommendation intelligence helps B2B software teams inspect how AI-mediated buyers are framing categories, which vendors are recommended, what evidence accompanies those recommendations, and what can safely be acted on.",
  path: "/recommendation-intelligence",
});

export default function RecommendationIntelligencePage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Foremention", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Recommendation Intelligence", item: `${SITE_URL}/recommendation-intelligence` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">The category</span>
          <h1>Recommendation intelligence for B2B software.</h1>
          <p>
            Recommendation intelligence is the discipline of observing how AI-mediated buyers
            frame a software category, which vendors are named or recommended, what references
            accompany those recommendations, and what the available evidence actually supports.
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="/product">Explore the product <Arrow /></Link>
            <Link className="text-link text-link--inverse" href="/methodology">Read the methodology <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell split-section">
          <div>
            <span className="eyebrow">Why the category exists</span>
            <h2>Visibility is not enough when buyers are receiving recommendations.</h2>
          </div>
          <div>
            <p>
              A mention count can tell a team that a brand appeared. It does not, by itself,
              preserve the buyer question, the observed answer, recommendation order, returned
              references, distinct retrievable sources, review state, limitations, or whether a later
              observation can validly be compared.
            </p>
            <p>
              Foremention treats those details as first-class evidence so a PMM or CMO can inspect
              the record before turning it into a decision.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell metric-layers">
          <div><span className="eyebrow">The chain</span><h2>Recommendation intelligence connects the observation to the evidence boundary.</h2></div>
          <div><h3>Question</h3><p>What did the buyer ask, and which question version was measured?</p></div>
          <div><h3>Recommendation</h3><p>Which vendors were named or recommended in the observed answer?</p></div>
          <div><h3>Evidence</h3><p>What references were returned, which distinct sources were retrievable, and what was actually observed?</p></div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div><span className="eyebrow eyebrow--on-ink">What it is not</span><h2>Not a synonym for generic AI visibility, GEO, AEO, or mention tracking.</h2></div>
          <div className="truth-list">
            <div><span>01</span><p><strong>Observed before inferred.</strong> Keep the answer record separate from interpretation.</p></div>
            <div><span>02</span><p><strong>Evidence before action.</strong> Inspect returned and retrievable sources without claiming causality.</p></div>
            <div><span>03</span><p><strong>Comparable before trend.</strong> Later measurements align only when the protocol is equivalent.</p></div>
          </div>
        </div>
      </section>

      <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">The defining object</span><h2>See how one recommendation becomes an inspectable record.</h2></div><Link className="button button--ink button--large" href="/recommendation-record">Recommendation Record <Arrow /></Link></div></section>
    </PublicShell>
  );
}
