import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Platform Pricing",
  description: "See Foremention private-beta access and the planned Core, Signal, and Intelligence commercial packaging for AI visibility evidence workflows.",
  path: "/pricing",
});

const plans = [
  {
    name: "Core",
    price: "$149",
    availability: "Planned paid packaging",
    label: "Establish the baseline",
    summary: "For one team building a defensible view of how its category appears in AI answers.",
    includes: null,
    items: ["One brand and category", "Up to 25 buyer questions", "Monthly collection capacity", "Source Map and evidence history", "Decision Lab reliability checks", "CSV workspace exports"],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "$499",
    availability: "Planned paid packaging",
    label: "Make movement actionable",
    lead: true,
    summary: "For growth teams that need weekly competitive evidence and a controlled path from signal to action.",
    includes: "Everything in Core, plus:",
    items: ["Up to three brand workspaces", "Up to 100 buyer questions", "Weekly collection capacity", "Cross-provider agreement analysis", "Source movement and priority gaps", "Team review workflow and exports"],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Intelligence",
    price: "Custom",
    availability: "Future commercial activation",
    label: "Operate across a portfolio",
    summary: "For multi-brand or high-volume teams that need a tailored evidence and data layer.",
    includes: "Everything in Signal, plus:",
    items: ["Multi-brand portfolio", "Custom question and run capacity", "Longer evidence retention", "Confirmed API, webhook, and export scope", "Role-based access and configuration controls", "Custom measurement design"],
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
    price: "Planned $149 / month",
    note: "Future commercial packaging; current self-serve workspaces enter the private free beta and no checkout is active.",
    source: "/pricing",
    sourceLabel: "Foremention pricing",
  },
  {
    product: "Peec AI",
    plan: "Starter",
    price: "$95 / month",
    note: "50 prompts, three models, one project; vendor says annual billing saves 15%.",
    source: "https://peec.ai/pricing",
    sourceLabel: "Peec AI pricing",
  },
  {
    product: "Scrunch",
    plan: "Starter",
    price: "$250 / month",
    note: "Annual price; three users, 350 custom prompts, 1,000 industry prompts, three personas, and five page audits.",
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
        <span className="eyebrow">Private beta + planned pricing</span>
        <h1>Private beta now. Paid plans only after explicit activation.</h1>
        <p>Self-serve signup currently creates a controlled free-beta workspace. The commercial packages below show the intended paid structure, but they do not represent a working checkout or an entitlement granted by signup.</p>
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
        <p>Creating a workspace does not charge a card or activate Core, Signal, or Intelligence. Paid capacity, billing, tax/entity details, cancellation terms, and payment-state handling must be verified before a commercial plan is activated.</p>
      </div>
    </section>
    <section className="section section--paper pricing-market-section">
      <div className="shell">
        <div className="platform-heading">
          <span className="eyebrow">Other vendors — market context</span>
          <h2>These are competitor prices, not additional Foremention plans.</h2>
          <p>The table is a separate market comparison using vendor-published list prices checked on August 9, 2026. Plans differ in prompts, providers, seats, frequency, and billing terms. Foremention&apos;s figure is explicitly planned packaging while the product remains in private beta.</p>
        </div>
        <p className="pricing-market-disclaimer"><strong>Comparison boundary:</strong> use this table only to compare public category pricing and capacity. Signup currently starts Foremention&apos;s private beta rather than a paid plan.</p>
        <div className="pricing-market-table" role="table" aria-label="AI visibility platform public pricing comparison">
          <div className="pricing-market-row pricing-market-row--head" role="row">
            <span role="columnheader">Platform</span><span role="columnheader">Compared plan</span><span role="columnheader">Public price</span><span role="columnheader">What that price describes</span>
          </div>
          {pricingComparison.map((item) => <div className={`pricing-market-row${item.product === "Foremention Core" ? " pricing-market-row--foremention" : ""}`} role="row" key={item.product}>
            <strong role="cell" data-label="Platform">{item.product}</strong>
            <span role="cell" data-label="Compared plan">{item.plan}</span>
            <span role="cell" data-label="Public price">{item.price}</span>
            <span role="cell" data-label="What that price describes">{item.note} <Link href={item.source} target={item.source.startsWith("http") ? "_blank" : undefined} rel={item.source.startsWith("http") ? "noreferrer" : undefined} aria-label={item.source.startsWith("http") ? `${item.sourceLabel} (opens in a new tab)` : item.sourceLabel}>{item.sourceLabel} <Arrow /></Link></span>
          </div>)}
        </div>
        <p className="pricing-source-note"><strong>Source note:</strong> Competitor facts come from each vendor&apos;s own published page, not a reseller or estimate. Prices can change and may exclude taxes, add-ons, overages, or regional terms. Check the linked source before purchasing. Foremention&apos;s listed paid price is planned commercial packaging and is not a working checkout.</p>
      </div>
    </section>
    <section className="section section--yellow">
      <div className="shell"><div className="platform-heading"><span className="eyebrow">Included by design</span><h2>Evidence customers can challenge.</h2></div><div className="pricing-shared">{shared.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div>
    </section>
  </PublicShell>;
}
