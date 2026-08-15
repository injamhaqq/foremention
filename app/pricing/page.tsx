import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Platform Pricing",
  description:
    "See Foremention private-beta access and the planned Core, Signal, and Intelligence commercial packaging for evidence-backed AI visibility workflows.",
  path: "/pricing",
});

const plans = [
  {
    name: "Core",
    price: "$149",
    availability: "Planned paid packaging",
    label: "Know your baseline",
    summary:
      "For one team that needs a defensible baseline of how buyers see its brand and category in AI answers.",
    includes: null,
    items: [
      "One brand and category",
      "Up to 25 buyer questions",
      "Monthly collection capacity",
      "Source Map and evidence history",
      "Decision Lab reliability checks",
      "CSV workspace exports",
    ],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "$499",
    availability: "Planned paid packaging",
    label: "Know what moved",
    lead: true,
    summary:
      "For growth teams that need weekly evidence, competitive context, and a reviewable path from movement to action.",
    includes: "Everything in Core, plus:",
    items: [
      "Up to three brand workspaces",
      "Up to 100 buyer questions",
      "Weekly collection capacity",
      "Cross-provider agreement analysis",
      "Source movement and priority gaps",
      "Team review workflow and exports",
    ],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Intelligence",
    price: "Custom",
    availability: "Future commercial activation",
    label: "Operate across brands",
    summary:
      "For multi-brand or high-volume teams that need a tailored evidence and data layer without losing the review trail.",
    includes: "Everything in Signal, plus:",
    items: [
      "Multi-brand portfolio",
      "Custom question and run capacity",
      "Longer evidence retention",
      "Confirmed API, webhook, and export scope",
      "Role-based access and configuration controls",
      "Custom measurement design",
    ],
    cta: "Discuss Intelligence",
    href: "/contact",
  },
];

const shared = [
  [
    "Dated answer records",
    "Keep the question, provider, model label, response, citations, and review state together.",
  ],
  [
    "No hidden composite score",
    "See the evidence checks separately so missing coverage cannot be disguised by an average.",
  ],
  [
    "Customer-owned workflow",
    "Your team creates questions, reviews runs, inspects sources, and controls actions inside the workspace.",
  ],
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Private beta + planned pricing</span>
          <h1>Know what AI says about your brand—and what changed.</h1>
          <p>
            Foremention turns AI answers into dated, inspectable evidence your team can
            review: what was said, which sources appeared, where the evidence is weak,
            and what to investigate next. Private beta is free today; the prices below
            are planned packaging, not active checkout.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell pricing-grid">
          {plans.map((plan) => (
            <article
              className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`}
              key={plan.name}
            >
              <span className="pricing-label">{plan.label}</span>
              <h2>{plan.name}</h2>
              <div className="price">
                <strong>{plan.price}</strong>
                {plan.price !== "Custom" && <span>/ month</span>}
              </div>
              <p className="pricing-includes">{plan.availability}</p>
              <p className="pricing-summary">{plan.summary}</p>
              {plan.includes && <p className="pricing-includes">{plan.includes}</p>}
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                className={`button ${plan.lead ? "button--ink" : "button--outline"}`}
                href={plan.href}
              >
                {plan.cta} <Arrow />
              </Link>
            </article>
          ))}
        </div>

        <div className="shell pricing-activation">
          <strong>Private beta is free today.</strong>
          <p>
            Creating a workspace does not charge a card. The $149 Core and $499 Signal
            prices are planned commercial packaging only; checkout, billing terms, and
            paid entitlements remain inactive until separately verified and authorized.
          </p>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell">
          <div className="platform-heading">
            <span className="eyebrow">Included by design</span>
            <h2>Evidence customers can challenge.</h2>
            <p>
              The product keeps the underlying answer, source, review state, and limits
              visible so a team can inspect the record before acting on it.
            </p>
          </div>
          <div className="pricing-shared">
            {shared.map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
