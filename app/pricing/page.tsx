import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Pricing - Private Beta",
  description:
    "Foremention commercial packaging is still being validated during private beta. Paid checkout is not active and final pricing has not been confirmed.",
  path: "/pricing",
  noIndex: true,
});

const plans = [
  {
    name: "Core",
    price: "Pricing to be confirmed",
    availability: "Private-beta package",
    label: "Establish the record",
    summary:
      "For one team that needs an inspectable baseline of how its category and vendors appear in observed AI recommendation answers.",
    includes: null,
    items: [
      "One brand and category",
      "Up to 25 buyer questions",
      "Monthly collection capacity",
      "Recommendation Records and evidence history",
      "Evidence inspection inside each record",
      "CSV workspace exports",
    ],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Signal",
    price: "Pricing to be confirmed",
    availability: "Private-beta package",
    label: "Review what changed",
    lead: true,
    summary:
      "For growth teams that need more frequent recommendation evidence, competitive context, and a reviewable path from observation to action.",
    includes: "Everything in Core, plus:",
    items: [
      "Up to three brand workspaces",
      "Up to 100 buyer questions",
      "Weekly collection capacity",
      "Cross-provider comparison context",
      "Source movement and review queues",
      "Team review workflow and exports",
    ],
    cta: "Join private beta",
    href: "/signup",
  },
  {
    name: "Intelligence",
    price: "Custom scope",
    availability: "Future commercial package",
    label: "Operate across coverage",
    summary:
      "For multi-brand or higher-coverage teams that need a tailored recommendation evidence layer without losing provenance or review state.",
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
    "Dated Recommendation Records",
    "Keep the buyer question, provider/model context, observed answer, returned references, source retrieval and review state together.",
  ],
  [
    "No hidden composite score",
    "See evidence states separately so missing coverage, uncertainty or an invalid comparison cannot be disguised by an average.",
  ],
  [
    "Customer-owned review workflow",
    "Your team creates questions, reviews observations, inspects evidence inside the Recommendation Record, and controls what becomes an action.",
  ],
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Private beta · packaging under validation</span>
          <h1>Commercial packaging is not final yet.</h1>
          <p>
            Foremention is validating how recommendation-intelligence coverage should be packaged
            across buyer questions, providers/models and measurement frequency. Self-serve signup
            currently creates a controlled private-beta workspace. The scopes below are working
            package hypotheses, not validated commercial pricing.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell pricing-grid">
          {plans.map((plan) => (
            <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
              <span className="pricing-label">{plan.label}</span>
              <h2>{plan.name}</h2>
              <div className="price"><strong>{plan.price}</strong></div>
              <p className="pricing-includes">{plan.availability}</p>
              <p className="pricing-summary">{plan.summary}</p>
              {plan.includes && <p className="pricing-includes">{plan.includes}</p>}
              <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>
                {plan.cta} <Arrow />
              </Link>
            </article>
          ))}
        </div>

        <div className="shell pricing-activation">
          <strong>Private beta is free today.</strong>
          <p>
            Creating a workspace does not charge a card or activate Core, Signal, or Intelligence.
            Paid checkout is not active. Final paid pricing, billing terms, coverage units and
            entitlements will be confirmed only after validation.
          </p>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell">
          <div className="platform-heading">
            <span className="eyebrow">Included by design</span>
            <h2>Evidence customers can challenge.</h2>
            <p>
              The product keeps the underlying observation, returned references, distinct sources,
              review state and limitations visible so a team can inspect the record before acting.
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
