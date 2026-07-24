import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Pricing", description: "Platform plans for teams building a durable recommendation intelligence layer." };

const plans = [
  { name: "Core", price: "$149", label: "For one category", items: ["One brand workspace", "Up to 25 buyer questions", "Monthly collection cadence", "Source Map and evidence history", "Workspace exports"], cta: "Create workspace", href: "/signup" },
  { name: "Signal", price: "$499", label: "For growing teams", lead: true, items: ["Up to three brand workspaces", "Up to 100 buyer questions", "Weekly collection cadence", "Source movement alerts", "Team access and integrations"], cta: "Create workspace", href: "/signup" },
  { name: "Intelligence", price: "Custom", label: "For category leaders", items: ["Multi-brand portfolio", "Daily collection options", "Custom data retention", "API and webhooks", "Implementation support"], cta: "Talk to Foremention", href: "/contact" },
];

export default function PricingPage() {
  return <PublicShell>
    <section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Platform pricing</span><h1>Pay for a durable intelligence layer—not a promised mention.</h1><p>Every plan is built around a workspace your team can run: buyer questions, observed answers, source evidence, competitor context, and movement over time.</p></div></section>
    <section className="section section--paper"><div className="shell pricing-grid">{plans.map((plan) => <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}><span className="pricing-label">{plan.label}</span><h2>{plan.name}</h2><div className="price"><strong>{plan.price}</strong>{plan.price !== "Custom" && <span>/ month</span>}</div><ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul><Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>{plan.cta} <Arrow /></Link></article>)}</div><div className="shell pricing-truth"><strong>Built for accountable growth</strong><p>Capacity is visible, evidence is dated, and plan changes are deliberate. Foremention never charges for guaranteed placement, ranking, citation, traffic, or revenue.</p></div></section>
  </PublicShell>;
}
