import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, SITE_URL, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "What Is Recommendation Intelligence?",
  description:
    "Recommendation Intelligence observes the AI recommendations buyers receive, preserves the evidence returned with them, and compares equivalent observations over time without confusing presence with proof.",
  path: "/recommendation-intelligence",
});

const differences = [
  ["SEO", "SEO improves how web content can be discovered and understood in search. Recommendation Intelligence starts later in the buying journey: it records what an AI-mediated buyer was actually shown for a defined buyer question and preserves the evidence boundary around that observation."],
  ["GEO / AEO", "GEO and AEO commonly focus on making content useful or eligible for generative and answer environments. Recommendation Intelligence measures observed recommendation behavior, provider context, returned evidence, review state, and comparable change; it does not promise that an optimization caused an answer."],
  ["Rank tracking", "Rank tracking follows ordered positions in a result set. AI answers are generated responses rather than a stable ranked list, so Foremention records recommendation presence and context instead of manufacturing a universal rank."],
  ["Generic AI visibility", "AI visibility can summarize mentions or share of voice. Recommendation Intelligence binds the observation to the exact buyer question, Recommendation Record, returned evidence, human review, uncertainty, and comparison conditions needed for a decision."],
] as const;

const vocabulary = [
  ["Buyer question", "The versioned question and decision context that define what is being observed."],
  ["Recommendation observation", "The provider answer and named or recommended brands observed at a specific time and measurement context."],
  ["Recommendation Record", "The inspectable unit that keeps question identity, provider/model context, answer, returned references, evidence state, review, limitations, and comparison eligibility together."],
  ["Evidence state", "Returned → Retrieved → Observed → Reviewed → Safe conclusion. Each stage says something different and must not impersonate the next."],
  ["Comparable later measurement", "A later observation aligned only when the question, provider context, protocol, market, and other material conditions remain equivalent enough to support comparison."],
  ["Attention", "A decision-relevant change, uncertainty, review need, or follow-up surfaced from persisted workspace evidence."],
] as const;

const manifesto = [
  "Observe before you optimize.",
  "Preserve the exact buyer question and measurement context.",
  "Keep returned references separate from reviewed evidence.",
  "Treat missing, insufficient, contradictory, and not-comparable states as product truth.",
  "Require human review before stronger conclusions.",
  "Compare later only when the measurement remains equivalent.",
  "Keep observed change separate from claimed business impact or causation.",
] as const;

export default function RecommendationIntelligencePage() {
  const structuredData = webPageJsonLd({
    name: "Recommendation Intelligence",
    description: "A category definition and operating model for evidence-backed measurement of AI-mediated buyer recommendations.",
    path: "/recommendation-intelligence",
  });
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Foremention", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Recommendation Intelligence", item: `${SITE_URL}/recommendation-intelligence` },
    ],
  };

  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    <section className="page-hero page-hero--ink">
      <div className="shell narrow-heading">
        <span className="eyebrow eyebrow--on-ink">Category definition</span>
        <h1>Recommendation Intelligence</h1>
        <p>Recommendation Intelligence is the discipline of observing, preserving, reviewing, and comparing the recommendations AI-mediated buyers receive—tied to the exact buyer question, provider/model context, returned evidence, review state, and measurement conditions—so teams can decide what to do next without confusing presence with proof.</p>
        <div className="page-hero__actions">
          <Link className="button" href="/methodology">Read the methodology <Arrow /></Link>
          <Link className="text-link text-link--inverse" href="/glossary">Open the glossary <Arrow /></Link>
        </div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="shell">
        <div className="section-heading"><span className="eyebrow">Why the category exists</span><h2>Software buying is gaining a recommendation layer.</h2><p>Teams already measure websites, search demand, pipelines, and revenue. A different question appears when buyers ask AI systems which products to consider: what recommendation was actually returned, what evidence accompanied it, how reliable is the observation, and did an equivalent later measurement change? Recommendation Intelligence gives that question its own evidence model.</p></div>
        <div className="system-grid">
          <article><span>01</span><h2>Register the observation</h2><p>Keep the buyer question, provider/model context, timestamp, answer, named brands, and returned references together.</p></article>
          <article><span>02</span><h2>Prove only what the evidence supports</h2><p>Separate returned, retrieved, observed, and human-reviewed states. A returned source relationship is not automatically causal proof.</p></article>
          <article><span>03</span><h2>Prepare the next decision</h2><p>Use reviewed evidence to choose follow-up work, then remeasure later only when the comparison remains valid.</p></article>
        </div>
      </div>
    </section>

    <section className="section section--surface">
      <div className="shell">
        <div className="section-heading"><span className="eyebrow">Category boundaries</span><h2>Related to search and AI visibility. Not interchangeable with them.</h2><p>Foremention uses precise boundaries so a measurement product does not inherit claims its evidence cannot support.</p></div>
        <div className="system-grid">{differences.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>)}</div>
      </div>
    </section>

    <section className="section section--yellow">
      <div className="shell split-section">
        <div><span className="eyebrow eyebrow--dark">Category manifesto</span><h2>Measure the recommendation. Preserve the evidence. Respect the boundary.</h2></div>
        <div className="truth-list">{manifesto.map((statement, index) => <div key={statement}><span>{String(index + 1).padStart(2, "0")}</span><p>{statement}</p></div>)}</div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="shell">
        <div className="section-heading"><span className="eyebrow">Shared vocabulary</span><h2>A category becomes useful when teams can name the same objects.</h2><p>The vocabulary is intentionally evidence-first. It avoids a single opaque score and keeps observation, evidence, review, decision, and later measurement distinct.</p></div>
        <div className="system-grid">{vocabulary.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>)}</div>
        <p><Link className="text-link" href="/glossary">Read the full Recommendation Intelligence glossary <Arrow /></Link></p>
      </div>
    </section>

    <section className="section section--ink">
      <div className="shell split-section">
        <div><span className="eyebrow eyebrow--on-ink">Founder point of view</span><h2>The unit of trust is the inspectable Record, not the loudest metric.</h2></div>
        <div><p>Foremention’s point of view is that teams should be able to challenge a recommendation observation: which buyer question produced it, which provider returned it, what references came back, what a human reviewed, what remains uncertain, and whether a later run is actually comparable. The product should make those questions easier to answer, not hide them behind an impressive-looking score.</p><Link className="text-link text-link--inverse" href="/recommendation-record">Explore the Recommendation Record <Arrow /></Link></div>
      </div>
    </section>
  </PublicShell>;
}
