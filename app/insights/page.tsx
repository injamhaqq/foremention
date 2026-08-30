import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { collectionPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Recommendation Intelligence Research",
  description: "Foremention Research on AI-mediated software buying, buyer questions, recommendation evidence, source behavior, provider variability, comparable measurement, and evidence-first methodology.",
  path: "/insights",
});

const articles = [
  { label: "Measurement guide", title: "AI visibility measurement: what to track, what to separate, and what not to promise", description: "A practical background guide for separating answer presence, returned citations, source evidence, referral traffic, and business outcomes without confusing correlation with causation.", href: "/insights/ai-visibility-measurement", updated: "July 27, 2026", read: "11 min" },
  { label: "Technical search guide", title: "The 2026 technical search checklist for an AI-discoverable website", description: "Crawlability, canonicals, sitemaps, structured data, internal links, AI search access, measurement, and the limits of optimization claims.", href: "/insights/seo-geo-technical-checklist", updated: "July 27, 2026", read: "12 min" },
] as const;

const researchPrograms = [
  ["State of Recommendation Intelligence", "Annual research program covering how AI-mediated software recommendation behavior, returned evidence, buyer questions, and comparable change evolve. Publication begins only when the methodology and eligible cohort support defensible claims."],
  ["Model behavior research", "Repeated observations designed to separate provider/model variability, temporal variance, failed runs, and genuine repeatable patterns."],
  ["Citation & source research", "Research on returned references, distinct sources, retrievability, review state, concentration, and the limits of inferring influence from source presence."],
  ["Buyer-question research", "Analysis of discovery, comparison, alternative, use-case, trust, and constraint questions once real question data is sufficiently governed and aggregated."],
  ["Category reports", "Focused research for software categories where question identity, provider context, market, methodology, and sample design can be made explicit."],
  ["Benchmark reports", "Cross-workspace benchmarks remain withheld until a privacy-safe eligible cohort reaches a documented minimum sample threshold and passes comparability and quality gates."],
] as const;

export default function InsightsPage() {
  const structuredData = collectionPageJsonLd({ name: "Foremention Research", description: "Evidence-first Recommendation Intelligence research and methodology.", path: "/insights" });
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Foremention Research</span><h1>Research the recommendation layer, not just the mention.</h1><p>Foremention develops evidence-first research around AI-mediated software buying, recommendation intelligence, buyer questions, source behavior, provider variability, comparable measurement, and the boundaries of what an observation can prove.</p></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Research programs</span><h2>Build authority from transparent methods and qualified data.</h2><p>Research pages may describe the program before a dataset qualifies, but benchmark findings, market statistics, customer outcomes, and comparative claims are published only after their underlying data and methodology pass the evidence gate.</p></div><div className="system-grid">{researchPrograms.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>)}</div></div></section>
    <section className="section section--surface"><div className="shell"><div className="section-heading"><span className="eyebrow">Publication gate</span><h2>No benchmark because a chart would look persuasive.</h2><p>Before a benchmark can be called a benchmark, Foremention should document cohort definition, minimum sample threshold, question identity, market and language, provider/model context, time window, failure handling, review coverage, privacy treatment, and comparison eligibility. If those conditions are not met, the benchmark stays withheld.</p></div></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Background guides</span><h2>Existing measurement and technical-search guidance.</h2><p>These guides remain useful context, but Foremention’s product category is Recommendation Intelligence rather than generic GEO or AI-visibility software.</p></div><div className="insight-grid">{articles.map((article, index) => <article className="insight-card" key={article.href}><div className="insight-card__meta"><span>{String(index + 1).padStart(2, "0")}</span><b>{article.label}</b></div><h2>{article.title}</h2><p>{article.description}</p><div className="insight-card__foot"><span>Updated {article.updated} · {article.read}</span><Link href={article.href}>Read guide <Arrow /></Link></div></article>)}</div></div></section>
    <section className="section section--yellow"><div className="shell split-section"><div><span className="eyebrow eyebrow--dark">Start with the method</span><h2>Recommendation research should remain inspectable.</h2></div><div><p>Question identity, provider context, timestamps, repeated sampling, failed runs, returned references, retrievability, review state and comparison eligibility all matter before a recommendation observation can support a stronger claim.</p><Link className="button button--ink" href="/methodology">Read the methodology <Arrow /></Link><Link className="text-link" href="/recommendation-intelligence">Read the category definition <Arrow /></Link></div></div></section>
  </PublicShell>;
}
