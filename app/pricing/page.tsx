import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence Plans",
  description:
    "Choose Foremention coverage by buyer questions, measurement frequency, brands, collaboration, and enterprise controls. Design-partner commercial terms remain founder-led while self-serve billing is being validated.",
  path: "/pricing",
  noIndex: true,
});

const plans = [
  {
    name: "Core",
    availability: "Establish the record",
    summary:
      "For one B2B software team that needs an inspectable baseline of how AI-mediated buyers are shown its category, brand, and evidence.",
    items: [
      "One brand and category",
      "Up to 25 approved buyer questions",
      "Monthly measurement cadence",
      "Recommendation Records with contained evidence inspection",
      "Human review and evidence-state history",
      "CSV and stakeholder-ready Record exports",
    ],
    cta: "Discuss Core",
    href: "/contact?plan=core",
  },
  {
    name: "Signal",
    availability: "Review what changed",
    lead: true,
    summary:
      "For growth and product-marketing teams that need more frequent comparable measurement, competitive context, review, and owned follow-through.",
    items: [
      "Up to three brand workspaces",
      "Up to 100 approved buyer questions",
      "Weekly measurement cadence",
      "Exact-comparison change context",
      "Team review, Attention, alerts, and actions",
      "Shareable Recommendation Records and exports",
    ],
    cta: "Discuss Signal",
    href: "/contact?plan=signal",
  },
  {
    name: "Intelligence",
    availability: "Operate across coverage",
    summary:
      "For multi-brand or enterprise teams that need custom measurement coverage, governance, integrations, and a recommendation-intelligence operating layer.",
    items: [
      "Multi-brand and multi-market scope",
      "Custom buyer-question and run capacity",
      "API, signed webhooks, and integration scope",
      "SSO when an enterprise connection is configured",
      "Role-based governance and audit-oriented controls",
      "Custom measurement and reporting design",
    ],
    cta: "Discuss Intelligence",
    href: "/contact?plan=intelligence",
  },
];

const shared = [
  [
    "Dated Recommendation Records",
    "Keep the buyer question, provider/model context, observed answer, returned references, source retrieval and review state together.",
  ],
  [
    "No hidden composite score",
    "See evidence states separately so missing coverage, uncertainty, or an invalid comparison cannot be disguised by an average.",
  ],
  [
    "Customer-owned review workflow",
    "Your team approves questions, reviews observations, inspects evidence inside the Recommendation Record, and controls what becomes an action.",
  ],
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Recommendation Intelligence plans</span>
          <h1>Choose the evidence coverage your team needs.</h1>
          <p>
            Foremention packages the workflow around the things that actually change operating cost and value:
            buyer-question coverage, measurement frequency, brands, collaboration, integrations, and governance.
            Every plan keeps the same inspectable evidence standard.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell pricing-grid">
          {plans.map((plan) => (
            <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
              <span className="pricing-label">{plan.availability}</span>
              <h2>{plan.name}</h2>
              <p className="pricing-summary">{plan.summary}</p>
              <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>
                {plan.cta} <Arrow />
              </Link>
            </article>
          ))}
        </div>

        <div className="shell pricing-activation">
          <strong>Commercial status</strong>
          <p>
            Founder-led design-partner pricing is being validated with real teams. Self-serve paid checkout is shown
            only when billing is configured for the workspace; creating a design-partner/private-beta workspace does
            not charge a card. Intelligence remains sales-led and custom-scoped.
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
              review state, and limitations visible so a team can inspect the record before acting.
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
