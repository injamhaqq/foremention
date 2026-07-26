import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "AI Visibility, GEO, and Source Intelligence Insights",
  description:
    "Evidence-based guides to AI visibility measurement, generative engine optimization, technical SEO, source mapping, and recommendation intelligence.",
  path: "/insights",
});

const articles = [
  {
    label: "Measurement guide",
    title: "AI visibility measurement: what to track, what to separate, and what not to promise",
    description:
      "A practical model for separating answer presence, citations, source evidence, referral traffic, and business outcomes.",
    href: "/insights/ai-visibility-measurement",
    updated: "July 27, 2026",
    read: "11 min",
  },
  {
    label: "Technical checklist",
    title: "The 2026 SEO and GEO technical checklist for an AI-discoverable website",
    description:
      "Crawlability, canonicals, sitemaps, structured data, internal links, AI search crawlers, measurement, and honest limitations.",
    href: "/insights/seo-geo-technical-checklist",
    updated: "July 27, 2026",
    read: "12 min",
  },
];

export default function InsightsPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Foremention Insights</span>
          <h1>Clear guidance for a category full of inflated claims.</h1>
          <p>
            Research-backed explanations of AI visibility, GEO, source
            intelligence, and the measurement boundaries that keep the work useful.
          </p>
        </div>
      </section>
      <section className="section section--paper">
        <div className="shell">
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
            <span className="eyebrow eyebrow--dark">Live proof</span>
            <h2>See the same method applied to this website.</h2>
          </div>
          <div>
            <p>
              The public Source Map records real technical problems found on
              Foremention.com, how they were verified, which fixes shipped, and which
              external signals still require connected data.
            </p>
            <Link className="button button--ink" href="/source-map">
              Inspect the live Source Map <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
