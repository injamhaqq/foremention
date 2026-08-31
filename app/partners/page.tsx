import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Partner Program",
  description: "A partner framework for agencies, consultants, SEO and GEO providers, B2B marketing firms, VC portfolios, accelerators, and integration partners using Foremention responsibly.",
  path: "/partners",
});

const tracks = [
  ["Agencies & B2B marketing firms", "Use Recommendation Records as an evidence boundary for client research, review, and later measurement without turning one observation into a performance guarantee."],
  ["Consultants", "Bring a repeatable buyer-question and evidence workflow into strategic engagements while keeping client workspaces and conclusions isolated."],
  ["SEO / GEO providers", "Connect technical and content work to observed recommendation evidence while preserving the distinction between optimization activity and causal proof."],
  ["VC portfolios", "Give portfolio operators a shared measurement language without exposing one company’s private workspace data to another."],
  ["Accelerators", "Teach founders how AI-mediated buyers encounter categories and products using inspectable methodology rather than unsupported visibility promises."],
  ["Integration partners", "Connect approved systems through explicit APIs and workspace permissions. Integration status is never inferred from a logo or a marketing mention."],
] as const;

export default function PartnersPage() {
  const structuredData = webPageJsonLd({ name: "Foremention Partner Program", description: "Partner infrastructure for evidence-backed Recommendation Intelligence workflows.", path: "/partners" });
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Partner distribution</span><h1>Bring Recommendation Intelligence into work you already own.</h1><p>Foremention’s partner model is designed for agencies, consultants, SEO/GEO providers, B2B marketing firms, VC portfolios, accelerators, and integration partners that need an inspectable recommendation-evidence workflow.</p><div className="page-hero__actions"><Link className="button" href="/contact">Discuss a partner use case <Arrow /></Link><Link className="text-link text-link--inverse" href="/methodology">Review the methodology <Arrow /></Link></div></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Partner tracks</span><h2>One evidence standard. Different operating contexts.</h2><p>Partner infrastructure should extend a customer’s workflow without weakening workspace isolation, evidence truth, or review responsibility.</p></div><div className="system-grid">{tracks.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>)}</div></div></section>
    <section className="section section--surface"><div className="shell split-section"><div><span className="eyebrow">Evidence boundary</span><h2>A program page is not proof of a partnership.</h2></div><div><p>No partner logos are shown here unless a real relationship has been approved for public use. Inclusion of a partner type does not imply an existing partnership, endorsement, customer relationship, or integration. Partner claims require their own evidence and approval.</p></div></div></section>
    <section className="section section--yellow"><div className="shell split-section"><div><span className="eyebrow eyebrow--dark">Operating model</span><h2>Start from a real customer or portfolio workflow.</h2></div><div><p>Qualify the use case, define data boundaries, assign workspace roles, agree on what may be shared, run the Recommendation Record workflow, and evaluate expansion only from observed usage and outcomes.</p><Link className="button button--ink" href="/contact">Request a partner conversation <Arrow /></Link></div></div></section>
  </PublicShell>;
}
