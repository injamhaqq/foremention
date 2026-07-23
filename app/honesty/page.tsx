import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Honesty clause", description: "The limits and exclusions behind Foremention's recommendation intelligence platform." };

export default function HonestyPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--yellow"><div className="shell narrow-heading"><span className="eyebrow">Honesty clause</span><h1>We sell useful infrastructure. We do not sell certainty we cannot own.</h1><p>This clause governs product behavior, data collection, scoring, and reporting.</p></div></section>
      <section className="section section--paper"><div className="shell honesty-grid"><article><span>01</span><h2>No guaranteed outcomes</h2><p>We do not guarantee editorial acceptance, publication, indexing, citations, rankings, model behavior, traffic, leads, or revenue.</p></article><article><span>02</span><h2>No fabricated authority</h2><p>We do not create false reviews, fake experts, undisclosed community promotion, synthetic consensus, or paid placements presented as independent editorial coverage.</p></article><article><span>03</span><h2>Evidence has dates</h2><p>AI answers vary and citations decay. Every observation belongs to a buyer question, provider, visible model label, geography, and collection time.</p></article><article><span>04</span><h2>Judgment is labelled</h2><p>Influence, fit, and feasibility are product assessments. They remain separate from measured citation counts and brand presence.</p></article><article><span>05</span><h2>Absence can be the finding</h2><p>When a brand is not present, a source is blocked, or evidence is too thin, the product says so directly instead of manufacturing a score.</p></article><article><span>06</span><h2>Customers control material claims</h2><p>Research contributions, quotes, review access, and outreach claims require accurate customer inputs and a recorded approval path.</p></article><article><span>07</span><h2>Providers remain independent</h2><p>AI providers, publishers, review sites, and search systems can change their models, policies, access, and results without notice.</p></article><article><span>08</span><h2>Questions are welcome</h2><p>Ask how an observation was collected or how a score was formed at <a href="mailto:hello@foremention.com">hello@foremention.com</a>.</p></article></div></section>
    </PublicShell>
  );
}
