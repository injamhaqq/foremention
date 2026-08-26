import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Source X-Ray",
  description:
    "Source X-Ray shows what an AI provider returned with a recommendation, what could be retrieved, what evidence was observed, what was reviewed, what remains uncertain, and what can safely be concluded.",
  path: "/source-x-ray",
});

const stages = [
  ["Returned", "What reference or source location did the provider return with the answer?"],
  ["Retrieved", "Could Foremention retrieve the returned destination, or was it unavailable?"],
  ["Observed", "What relevant evidence was actually present in the retrievable source?"],
  ["Reviewed", "What has a human inspected, accepted, rejected or left pending?"],
  ["Conclude", "What conclusion is supported, and which claims remain unproven?"],
] as const;

export default function SourceXRayPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Foremention", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Source X-Ray", item: `${SITE_URL}/source-x-ray` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">The signature evidence experience</span>
          <h1>Source X-Ray.</h1>
          <p>
            Follow the evidence from what the provider returned to what could actually be retrieved,
            what was observed, what a human reviewed, and what the record can safely support.
            A returned source is evidence of what came with the answer—not causal proof of why the recommendation appeared.
          </p>
          <div className="page-hero__actions">
            <Link className="button" href="#source-xray">See the interaction <Arrow /></Link>
            <Link className="text-link text-link--inverse" href="/methodology">Read the methodology <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="goat-xray-section goat-xray-section--product">
        <div className="shell"><SourceXRayExperience /></div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">The inspection sequence</span>
            <h2>Returned → retrieved → observed → reviewed → conclude.</h2>
            <p>Each stage answers a different question. Collapsing them would overstate what the evidence proves.</p>
          </div>
          <div className="system-grid">
            {stages.map(([title, body], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell metric-layers">
          <div><span className="eyebrow">Safe conclusion</span><h2>Keep causal restraint visible in the product.</h2></div>
          <div><h3>Supported</h3><p>A provider returned a reference; the destination was retrievable; relevant evidence was observed.</p></div>
          <div><h3>Still uncertain</h3><p>The returned source may or may not have influenced the model output. Foremention does not infer causation from co-occurrence.</p></div>
          <div><h3>Later measurement</h3><p>Source movement becomes meaningful only when the later observation is validly comparable.</p></div>
        </div>
      </section>

      <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">The parent object</span><h2>Every Source X-Ray belongs to an inspectable Recommendation Record.</h2></div><Link className="button button--ink button--large" href="/recommendation-record">Recommendation Record <Arrow /></Link></div></section>
    </PublicShell>
  );
}
