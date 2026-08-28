import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI-Mediated Software Buying",
  description:
    "AI-mediated software buying describes software discovery and evaluation journeys in which AI assistants help frame categories, surface vendors, summarize evidence, and influence what buyers investigate next.",
  path: "/ai-mediated-buying",
});

export default function AIMediatedBuyingPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Foremention", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "AI-Mediated Software Buying", item: `${SITE_URL}/ai-mediated-buying` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">The market shift</span>
          <h1>AI-mediated software buying.</h1>
          <p>
            Software buyers increasingly use AI assistants to frame categories, compare options,
            ask follow-up questions and decide what to investigate next. That creates a new measurement
            problem: teams need to understand the recommendation itself, the evidence that accompanied it,
            and the limits of what one observation can prove.
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="/recommendation-intelligence">Recommendation Intelligence <Arrow /></Link>
            <Link className="text-link text-link--inverse" href="/contact">Request a demo <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell split-section">
          <div><span className="eyebrow">What changes for software teams</span><h2>The buyer journey can now be partially mediated by a model before a vendor ever sees the buyer.</h2></div>
          <div>
            <p>That does not mean every AI answer causes a purchase, or that one recommendation observation represents the whole market.</p>
            <p>It means software teams have a new evidence surface worth measuring carefully: the questions buyers ask, the answers they receive, the vendors named, the references returned, the sources that can be inspected, and how those observations change over time.</p>
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell metric-layers">
          <div><span className="eyebrow">The operating model</span><h2>Observe the recommendation journey without pretending to see inside the model.</h2></div>
          <div><h3>Buyer question</h3><p>Start with the language a software buyer may genuinely use.</p></div>
          <div><h3>Provider answer</h3><p>Record what the provider actually returned, including named vendors and returned references when available.</p></div>
          <div><h3>Evidence + review</h3><p>Inspect retrievability, relevant evidence, uncertainty and human review before turning the observation into action.</p></div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div><span className="eyebrow eyebrow--on-ink">The long-term thesis</span><h2>Comparable history can become infrastructure.</h2></div>
          <div className="truth-list">
            <div><span>01</span><p><strong>Method.</strong> Stable question identity, provider context, timestamping, source provenance and review discipline.</p></div>
            <div><span>02</span><p><strong>History.</strong> Repeated observations that can be compared when the measurement protocol is equivalent.</p></div>
            <div><span>03</span><p><strong>Workflow.</strong> Recommendation evidence that becomes reviewable, shareable and decision-relevant across PMM and marketing leadership.</p></div>
          </div>
        </div>
      </section>

      <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">See the product object</span><h2>Start with one recommendation observation and make it inspectable.</h2></div><Link className="button button--ink button--large" href="/recommendation-record">Recommendation Record <Arrow /></Link></div></section>
    </PublicShell>
  );
}
