import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Platform Pricing",
  description: "Compare Foremention Core, Signal, and Intelligence plans for AI answer monitoring, Source Maps, evidence review, reliability checks, and team workflows.",
  path: "/pricing",
});

const plans = [
  {
    name: "Core",
    price: "$149",
    label: "Establish the baseline",
    summary: "For one team building a defensible view of how its category appears in AI answers.",
    items: ["One brand and category", "Up to 25 buyer questions", "Monthly reviewed collection", "Source Map and evidence history", "Decision Lab reliability checks", "CSV workspace exports"],
    cta: "Create Core workspace",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "$499",
    label: "Make movement actionable",
    lead: true,
    summary: "For growth teams that need weekly competitive evidence and a controlled path from signal to action.",
    items: ["Up to three brand workspaces", "Up to 100 buyer questions", "Weekly reviewed collection", "Cross-provider agreement analysis", "Source movement and priority gaps", "Team workflow and integrations"],
    cta: "Create Signal workspace",
    href: "/signup",
  },
  {
    name: "Intelligence",
    price: "Custom",
    label: "Operate across a portfolio",
    summary: "For multi-brand or high-volume teams that need a tailored evidence and data layer.",
    items: ["Multi-brand portfolio", "Custom question and run capacity", "Longer evidence retention", "API, webhooks, and exports", "Access controls and onboarding", "Custom measurement design"],
    cta: "Discuss Intelligence",
    href: "/contact",
  },
];

const shared = [
  ["Dated answer records", "Keep the question, provider, model label, response, citations, and review state together."],
  ["No hidden composite score", "See the evidence checks separately so missing coverage cannot be disguised by an average."],
  ["Customer-owned workflow", "Your team creates questions, reviews runs, inspects sources, and controls actions inside the workspace."],
];

const pricingComparison = [
  {
    product: "Foremention Core",
    plan: "Core",
    price: "$149 / month",
    note: "25 buyer questions; paid activation follows verified billing setup.",
    source: "/pricing",
    sourceLabel: "Foremention pricing",
  },
  {
    product: "Peec AI",
    plan: "Starter",
    price: "$95 / month",
    note: "50 prompts, three models, one project; vendor says annual billing saves 15%.",
    source: "https://peec.ai/ai-instructions",
    sourceLabel: "Peec AI pricing source",
  },
  {
    product: "Scrunch",
    plan: "Core",
    price: "$250 / month",
    note: "125 unique prompts, four LLMs, one brand workspace and five user licences.",
    source: "https://scrunch.com/pricing/",
    sourceLabel: "Scrunch pricing",
  },
  {
    product: "Profound",
    plan: "Growth",
    price: "$399 / month",
    note: "100 prompts, three answer engines and three seats; billed yearly.",
    source: "https://www.tryprofound.com/pricing",
    sourceLabel: "Profound pricing",
  },
];

export default function PricingPage() {
  return <PublicShell>
    <section className="page-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Platform pricing</span>
        <h1>Pay for a repeatable intelligence system—not a one-off audit.</h1>
        <p>Plans scale with brands, buyer questions, collection frequency, evidence history, and team workflow. Outcomes such as ranking, citation, traffic, or revenue are never sold as guarantees.</p>
      </div>
    </section>
    <section className="section section--paper">
      <div className="shell pricing-grid">
        {plans.map((plan) => <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
          <span className="pricing-label">{plan.label}</span>
          <h2>{plan.name}</h2>
          <div className="price"><strong>{plan.price}</strong>{plan.price !== "Custom" && <span>/ month</span>}</div>
          <p className="pricing-summary">{plan.summary}</p>
          <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
          <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>{plan.cta} <Arrow /></Link>
        </article>)}
      </div>
      <div className="shell pricing-activation">
        <strong>Commercial activation is explicit.</strong>
        <p>Creating a workspace does not charge a card. Provider capacity, collection frequency, and billing are confirmed before paid activation; features that need a live integration remain labelled until connected.</p>
      </div>
    </section>
    <section className="section section--paper pricing-market-section">
      <div className="shell">
        <div className="platform-heading">
          <span className="eyebrow">Public pricing snapshot</span>
          <h2>Compare the plan, not only the number.</h2>
          <p>These are vendor-published list prices checked on August 2, 2026. Plans differ in prompts, providers, seats, frequency, and billing terms.</p>
        </div>
        <div className="pricing-market-table" role="table" aria-label="AI visibility platform public pricing comparison">
          <div className="pricing-market-row pricing-market-row--head" role="row">
            <span role="columnheader">Platform</span><span role="columnheader">Compared plan</span><span role="columnheader">Public price</span><span role="columnheader">What that price describes</span>
          </div>
          {pricingComparison.map((item) => <div className="pricing-market-row" role="row" key={item.product}>
            <strong role="cell">{item.product}</strong>
            <span role="cell">{item.plan}</span>
            <span role="cell">{item.price}</span>
            <span role="cell">{item.note} <Link href={item.source} target={item.source.startsWith("http") ? "_blank" : undefined} rel={item.source.startsWith("http") ? "noreferrer" : undefined}>{item.sourceLabel} <Arrow /></Link></span>
          </div>)}
        </div>
        <p className="pricing-source-note"><strong>Source note:</strong> Competitor facts come from each vendor&apos;s own published page, not a reseller or estimate. Prices can change and may exclude taxes, add-ons, overages, or regional terms. Check the linked source before purchasing. Foremention&apos;s listed price is not a working checkout until its payment integration is verified.</p>
      </div>
    </section>
    <section className="section section--yellow">
      <div className="shell"><div className="platform-heading"><span className="eyebrow">Included by design</span><h2>Evidence customers can challenge.</h2></div><div className="pricing-shared">{shared.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div>
    </section>
  </PublicShell>;
}
