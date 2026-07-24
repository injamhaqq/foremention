import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Pricing", description: "Self-serve recommendation intelligence for teams tracking how AI systems discover, support, and recommend their brand." };

const offers = [
  { name: "Free beta", price: "$0", suffix: "/ month", label: "Available now", lead: true, items: ["1 brand and category", "10 approved buyer questions", "20 provider-prompt observations per month", "90 days of observation history", "Source Map CSV export"], cta: "Create free account", href: "/signup" },
  { name: "Product demo", price: "$0", suffix: "/ forever", label: "Explore safely", lead: false, items: ["Full fictional workspace", "Recommendation journey", "Source X-Ray and Source Map", "No API key required", "No card required"], cta: "Open the demo", href: "/login" },
  { name: "Future paid plans", price: "Later", label: "Not for sale yet", lead: false, items: ["Higher verified provider capacity", "More brands and team members", "Longer evidence history", "Automation and integrations", "Billing only after webhook verification"], cta: "Contact us", href: "/contact" },
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Self-serve beta</span><h1>Start with one question. Build your recommendation data layer.</h1><p>The beta has one clear usage limit and no credit card. Paid capacity is not sold until provider, billing, and entitlement controls have been verified.</p></div></section>
      <section className="section section--paper">
        <div className="shell pricing-grid">{offers.map((offer) => <article className={`pricing-card${offer.lead ? " pricing-card--lead" : ""}`} key={offer.name}><span className="pricing-label">{offer.label}</span><h2>{offer.name}</h2><div className="price"><strong>{offer.price}</strong>{offer.suffix && <span>{offer.suffix}</span>}</div><ul>{offer.items.map((item) => <li key={item}>{item}</li>)}</ul><Link className={`button ${offer.lead ? "button--ink" : "button--outline"}`} href={offer.href}>{offer.cta} <Arrow /></Link></article>)}</div>
        <div className="shell pricing-truth"><strong>Commercial honesty</strong><p>Foremention stores dated observations and workflow data. It does not sell editorial influence, guarantee rankings, citations, traffic, or revenue, or quietly activate a paid plan from a checkout page.</p></div>
      </section>
    </PublicShell>
  );
}
