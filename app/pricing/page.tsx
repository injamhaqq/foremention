import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Pricing", description: "Self-serve recommendation intelligence for teams tracking how AI systems discover, support, and recommend their brand." };

const offers = [
  { name: "Explorer", price: "$0", suffix: "/ month", label: "Validate", lead: false, items: ["1 brand and category", "10 tracked buyer questions", "Monthly evidence run", "Source Gap snapshot", "CSV export"], cta: "Create free account", href: "/signup" },
  { name: "Builder", price: "$49", suffix: "/ month", label: "Launch", lead: false, items: ["1 brand and 100 questions", "Weekly multi-engine runs", "URL-level Source Map", "Competitor movement", "Email alerts"], cta: "Start building", href: "/signup" },
  { name: "Growth", price: "$199", suffix: "/ month", label: "Most useful", lead: true, items: ["5 brands and 1,000 questions", "Daily monitoring", "Recommendation Graph", "Evidence and action workspace", "API and webhooks"], cta: "Start Growth", href: "/signup" },
  { name: "Scale", price: "Custom", label: "Infrastructure", lead: false, items: ["Higher-volume collection", "Team roles and workspaces", "Warehouse exports", "Custom retention and regions", "Priority infrastructure support"], cta: "Contact us", href: "/contact" },
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Self-serve pricing</span><h1>Start with one question. Build your recommendation data layer.</h1><p>Every plan is software. Upgrade when you need more questions, engines, brands, history, automation, and infrastructure access.</p></div></section>
      <section className="section section--paper">
        <div className="shell pricing-grid">{offers.map((offer) => <article className={`pricing-card${offer.lead ? " pricing-card--lead" : ""}`} key={offer.name}><span className="pricing-label">{offer.label}</span><h2>{offer.name}</h2><div className="price"><strong>{offer.price}</strong>{offer.suffix && <span>{offer.suffix}</span>}</div><ul>{offer.items.map((item) => <li key={item}>{item}</li>)}</ul><Link className={`button ${offer.lead ? "button--ink" : "button--outline"}`} href={offer.href}>{offer.cta} <Arrow /></Link></article>)}</div>
        <div className="shell pricing-truth"><strong>Commercial honesty</strong><p>Subscriptions provide collection, analysis, storage, alerts, and workflow software. They do not purchase editorial decisions or guarantee rankings, citations, traffic, or revenue.</p></div>
      </section>
    </PublicShell>
  );
}