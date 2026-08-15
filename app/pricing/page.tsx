import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Platform Pricing",
  description: "See Foremention private-beta access and the planned Core, Signal, and Intelligence packaging for evidence-backed AI visibility workflows.",
  path: "/pricing",
});

const plans = [
  {
    name: "Core",
    price: "$149",
    availability: "Planned paid packaging",
    label: "Build a defensible baseline",
    summary: "For one team that needs to know how AI answers describe its brand and which evidence supports those observations.",
    includes: null,
    items: ["One brand and category", "Up to 25 approved buyer questions", "Monthly collection capacity", "Dated answer and evidence history", "Source Map and Decision Lab review", "CSV workspace exports"],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "$499",
    availability: "Planned paid packaging",
    label: "Review meaningful movement sooner",
    lead: true,
    summary: "For growth teams that need broader, more frequent evidence across questions, providers, workspaces, and reviewers.",
    includes: "Everything in Core, plus:",
    items: ["Up to three brand workspaces", "Up to 100 approved buyer questions", "Weekly collection capacity", "Cross-provider agreement analysis", "Reviewed source movement and priority gaps", "Team review workflow and exports"],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Intelligence",
    price: "Custom",
    availability: "Future commercial activation",
    label: "Operate across a portfolio",
    summary: "For multi-brand or high-volume teams that need a tailored evidence, governance, and data layer.",
    includes: "Everything in Signal, plus:",
    items: ["Multi-brand portfolio", "Custom question and run capacity", "Longer evidence retention", "Confirmed API, webhook, and export scope", "Role-based access and configuration controls", "Custom measurement design"],
    cta: "Discuss Intelligence",
    href: "/contact",
  },
];

const shared = [
  ["Dated answer records", "Keep the approved question, provider, model label, response, returned citations, and review state together."],
  ["Evidence you can inspect", "See the underlying checks separately instead of trusting a hidden composite score."],
  ["Human review before claims", "Your team reviews runs and sources before Foremention treats an observation as a publishable finding."],
];

export default function PricingPage() {
  return <PublicShell>
    <section className="page-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Private beta + planned paid packaging</span>
        <h1>Know what AI says about your brand. Know where it came from. Know what actually changed.</h1>
        <p>Foremention turns dated AI answers, returned citations, source observations, and human review into evidence your team can inspect. Self-serve signup currently creates a controlled free-beta workspace; the packages below show the planned commercial structure, not a live checkout.</p>
      </div>
    </section>
    <section className="section section--paper">
      <div className="shell pricing-grid">
        {plans.map((plan) => <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
          <span className="pricing-label">{plan.label}</span>
          <h2>{plan.name}</h2>
          <div className="price"><strong>{plan.price}</strong>{plan.price !== "Custom" && <span>/ month</span>}</div>
          <p className="pricing-includes">{plan.availability}</p>
          <p className="pricing-summary">{plan.summary}</p>
          {plan.includes && <p className="pricing-includes">{plan.includes}</p>}
          <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
          <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>{plan.cta} <Arrow /></Link>
        </article>)}
      </div>
      <div className="shell pricing-activation">
        <strong>Private beta is the live entitlement.</strong>
        <p>Creating a workspace does not charge a card or activate Core, Signal, or Intelligence. The planned pricing is not a working checkout until its payment integration is verified. Paid capacity, billing, tax/entity details, cancellation terms, and payment-state handling must be verified before a commercial plan is activated.</p>
        <p>Want category context without turning this page into a vendor directory? <Link href="/compare">See dated market evidence and comparison methods <Arrow /></Link></p>
      </div>
    </section>
    <section className="section section--yellow">
      <div className="shell"><div className="platform-heading"><span className="eyebrow">Included by design</span><h2>Evidence your team can challenge.</h2><p>Foremention is designed to preserve what was observed, what was returned by the provider, what was inferred, and what was human-reviewed instead of collapsing them into one opaque score.</p></div><div className="pricing-shared">{shared.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div>
    </section>
  </PublicShell>;
}
