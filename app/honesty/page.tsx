import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Honesty clause", description: "The limits and exclusions behind Foremention's recommendation intelligence platform." };

export default function HonestyPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--yellow"><div className="shell narrow-heading"><span className="eyebrow">Product standards</span><h1>Useful data, without invented certainty.</h1><p>Foremention is designed to help teams make decisions from dated evidence—not to promise outcomes that nobody can control.</p></div></section>
      <section className="section section--paper"><div className="shell honesty-intro"><span>How the platform behaves</span><p>Every score, source, and recommendation should have a clear origin, a timestamp, and a visible limit.</p></div><div className="shell honesty-grid"><article><span>01</span><h2>Outcomes are not for sale</h2><p>We do not guarantee rankings, citations, traffic, leads, revenue, editorial acceptance, or AI model behavior.</p></article><article><span>02</span><h2>Evidence is time-bound</h2><p>AI answers vary and sources change. Observations are tied to a question, provider, model label, geography, and collection time.</p></article><article><span>03</span><h2>Absence is a valid result</h2><p>If a brand is not present, a source is inaccessible, or evidence is thin, the platform shows that directly.</p></article><article><span>04</span><h2>Measured facts stay separate</h2><p>Source counts and brand presence are not mixed with product judgments such as fit, influence, or feasibility.</p></article><article><span>05</span><h2>No synthetic authority</h2><p>No fake reviews, undisclosed promotion, fabricated experts, or paid placement presented as independent evidence.</p></article><article><span>06</span><h2>Customers own their claims</h2><p>Any material input, quote, or external claim needs accurate customer information and a recorded approval path.</p></article><article><span>07</span><h2>Independent systems change</h2><p>AI providers, publishers, review sites, and search systems can change their rules, access, and outputs without notice.</p></article><article><span>08</span><h2>Ask how it was formed</h2><p>For a collection or scoring question, contact <a href="mailto:hello@foremention.com">hello@foremention.com</a>.</p></article></div></section>
    </PublicShell>
  );
}
