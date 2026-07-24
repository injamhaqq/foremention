import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Straightforward platform plans for teams building durable AI recommendation intelligence.",
};

const plans = [
  {
    name: "Core",
    price: "$149",
    label: "Build the baseline",
    summary: "A focused operating view for one category and the questions buyers ask before choosing.",
    items: ["One brand workspace", "Up to 25 buyer questions", "Monthly collection cadence", "Source Map and evidence history", "Workspace exports"],
    cta: "Explore Core",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "$499",
    label: "Turn movement into decisions",
    lead: true,
    summary: "For teams that need a dependable weekly read on competitors, sources, and changes.",
    items: ["Up to three brand workspaces", "Up to 100 buyer questions", "Weekly collection cadence", "Source movement alerts", "Team access and integrations"],
    cta: "Explore Signal",
    href: "/signup",
  },
  {
    name: "Scale",
    price: "Custom",
    label: "Grow with your category",
    summary: "Portfolio-wide monitoring and a tailored data layer as your intelligence operation expands.",
    items: ["Multi-brand portfolio", "Daily collection options", "Longer evidence retention", "API and webhooks", "Custom capacity planning"],
    cta: "Discuss Scale",
    href: "/contact",
  },
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Platform pricing</span>
          <h1>Start with a category. Scale the intelligence layer when it proves useful.</h1>
          <p>Every plan is software your team operates: buyer questions, observed answers, source evidence, competitor context, and movement over time.</p>
        </div>
      </section>
      <section className="section section--paper">
        <div className="shell pricing-grid">
          {plans.map((plan) => (
            <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
              <span className="pricing-label">{plan.label}</span>
              <h2>{plan.name}</h2>
              <div className="price">
                <strong>{plan.price}</strong>
                {plan.price !== "Custom" && <span>/ month</span>}
              </div>
              <p className="pricing-summary">{plan.summary}</p>
              <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>{plan.cta} <Arrow /></Link>
            </article>
          ))}
        </div>
        <div className="shell pricing-truth">
          <strong>Clear by design</strong>
          <p>Foremention is priced for collection capacity and software access—not promised placement, ranking, citation, traffic, or revenue. Plan capacity is always visible before it changes.</p>
        </div>
      </section>
    </PublicShell>
  );
}
