import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Recommendation Intelligence Research",
  description:
    "Foremention research on AI-mediated software buying, buyer questions, recommendation evidence, source quality, provider variability, comparable measurement, and evidence-first methodology.",
  path: "/insights",
});

const articles = [
  {
    label: "Measurement guide",
    title: "AI visibility measurement: what to track, what to separate, and what not to promise",
    description:
      "A practical background guide for separating answer presence, returned citations, source evidence, referral traffic, and business outcomes without confusing correlation with causation.",
    href: "/insights/ai-visibility-measurement",
    updated: "July 27, 2026",
    read: "11 min",
  },
  {
    label: "Technical search guide",
    title: "The 2026 technical search checklist for an AI-discoverable website",
    description:
      "Crawlability, canonicals, sitemaps, structured data, internal links, AI search access, measurement, and the limits of optimization claims.",
    href: "/insights/seo-geo-technical-checklist",
    updated: "July 27, 2026",
    read: "12 min",
  },
];

const researchAreas = [
  ["Buyer questions", "How real software-buying questions change by category, stage, role, and decision context."],
  ["Recommendation evidence", "What references accompany observed recommendations, which destinations are distinct and retrievable, and what the evidence actually supports."],
  ["Provider variability", "How recommendations and returned evidence vary across providers, models, time, and repeated sampling."],
  ["Comparable measurement", "When two observations can be validly aligned—and when Foremention should explicitly refuse the comparison."],
] as const;

export default function InsightsPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Foremention Research</span>
          <h1>Research the recommendation layer, not just the mention.</h1>
          <p>
            Foremention publishes and develops evidence-first thinking around AI-mediated software
            buying, recommendation intelligence, buyer questions, source quality, provider variability,
            comparable measurement, and the boundaries of what one observation can prove.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Research agenda</span>
            <h2>Build intellectual authority where the measurement problem is still forming.</h2>
            <p>
              Future indexes and benchmarks should only be published when the underlying methodology,
              sampling, failure handling, review process and data quality can support them.
            </p>
          </div>
          <div className="system-grid">
            {researchAreas.map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Background guides</span>
            <h2>Existing measurement and technical-search guidance.</h2>
            <p>
              These guides remain useful context, but Foremention&apos;s product category is
              Recommendation Intelligence rather than generic GEO or AI-visibility software.
            </p>
          </div>
          <div className="insight-grid">
            {articles.map((article, index) => (
              <article className="insight-card" key={article.href}>
                <div className="insight-card__meta">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{article.label}</b>
                </div>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <div className="insight-card__foot">
                  <span>Updated {article.updated} · {article.read}</span>
                  <Link href={article.href}>Read guide <Arrow /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell split-section">
          <div>
            <span className="eyebrow eyebrow--dark">Start with the method</span>
            <h2>Recommendation research should remain inspectable.</h2>
          </div>
          <div>
            <p>
              Question identity, provider context, timestamps, repeated sampling, failed runs,
              returned references, retrievability, review state and comparison eligibility all matter
              before a recommendation observation can support a stronger claim.
            </p>
            <Link className="button button--ink" href="/methodology">
              Read the methodology <Arrow />
            </Link>
            <Link className="text-link" href="/recommendation-record">
              Explore the Recommendation Record <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
