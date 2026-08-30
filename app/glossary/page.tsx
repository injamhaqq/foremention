import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { definedTermSetJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Glossary",
  description: "Definitions for Recommendation Records, buyer questions, recommendation observations, returned source evidence, review states, comparability, and other Foremention methodology terms.",
  path: "/glossary",
});

const terms = [
  ["Recommendation Intelligence", "The discipline of observing, preserving, reviewing, and comparing AI-mediated buyer recommendations with their measurement context and evidence boundary."],
  ["Buyer question", "A versioned software-buying question tied to decision intent, market, and other context required to interpret an observation."],
  ["Recommendation observation", "What a provider returned for a buyer question at a recorded time, including the answer and any named or recommended brands."],
  ["Recommendation Record", "The durable unit that keeps question identity, provider/model context, timestamps, answer text, returned references, evidence inspection, review state, limitations, and comparison eligibility together."],
  ["Returned reference", "A reference or destination returned with an observed answer. It records provider output; it does not by itself prove relevance, endorsement, or causation."],
  ["Returned source evidence", "Evidence associated with source locations returned by a provider. Foremention still distinguishes the raw returned reference from a normalized distinct source and from later human review."],
  ["Distinct source", "A normalized source destination kept separate from duplicate references without collapsing genuinely different pages."],
  ["Retrievability", "The observed ability to retrieve a returned destination at the time of inspection. Retrievable does not mean reviewed or influential."],
  ["Evidence state", "The staged boundary Returned → Retrieved → Observed → Reviewed → Safe conclusion."],
  ["Human review", "A person’s explicit inspection state for evidence or a conclusion. Pending, excluded, insufficient, or contradictory evidence stays visible."],
  ["Safe conclusion", "A conclusion whose strength is bounded by the available observation, evidence, review, and methodology state."],
  ["Comparable later measurement", "A later observation whose buyer question, provider context, protocol, market, and other material conditions remain equivalent enough for comparison."],
  ["Not comparable", "A deliberate state used when material measurement conditions changed enough that two runs should not be presented as one trend."],
  ["Recommendation presence", "Whether a brand was observed in the relevant provider answer. Presence is contextual and is not a universal rank."],
  ["Source concentration", "How returned or reviewed source observations are distributed. Concentration can prompt review but does not prove causal influence."],
  ["Attention", "A persisted, decision-relevant change, uncertainty, review need, or follow-up surfaced from the workspace."],
] as const;

export default function GlossaryPage() {
  const structuredData = definedTermSetJsonLd({
    name: "Recommendation Intelligence Glossary",
    description: "Foremention terminology for evidence-backed AI recommendation measurement.",
    path: "/glossary",
    terms: terms.map(([name, description]) => ({ name, description })),
  });

  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Industry glossary</span><h1>The vocabulary of Recommendation Intelligence.</h1><p>Shared definitions keep recommendation observations, returned source evidence, review, comparability, and later outcomes from being collapsed into one vague visibility metric.</p></div></section>
    <section className="section section--paper"><div className="shell"><div className="system-grid">{terms.map(([term, definition], index) => <article key={term}><span>{String(index + 1).padStart(2, "0")}</span><h2>{term}</h2><p>{definition}</p></article>)}</div></div></section>
    <section className="section section--yellow"><div className="shell split-section"><div><span className="eyebrow eyebrow--dark">Method over jargon</span><h2>Definitions should map to inspectable product states.</h2></div><div><p>If a term cannot be traced back to a buyer question, Recommendation Record, evidence state, review decision, or comparison rule, it should not become a persuasive metric by default.</p><Link className="button button--ink" href="/methodology">Read the methodology <Arrow /></Link></div></div></section>
  </PublicShell>;
}
