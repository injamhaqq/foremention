import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { billingProviderId, paddleLiveConfigured } from "@/lib/billing-provider";

// Purchasability is read from live billing configuration at request time.
export const dynamic = "force-dynamic";

function selfServeCheckoutLive() {
  return billingProviderId() === "paddle" && paddleLiveConfigured();
}

const purchasable: Record<string, { availability: string; cta: string; href: string }> = {
  Core: { availability: "7-day free trial · no card required", cta: "Start 7-day free trial", href: "/signup?next=%2Fapp%2Fsettings%3Ftrial%3Dcore%23billing" },
  Signal: { availability: "Monthly · cancel anytime", cta: "Start with Signal", href: "/signup?next=%2Fapp%2Fsettings%3Fplan%3Dsignal%23billing" },
};

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
    availability: "Proposed · not yet purchasable",
    price: "$99 / month",
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
    availability: "Proposed · not yet purchasable",
    price: "$299 / month",
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
    availability: "Custom scope · request a quote",
    price: "Custom",
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
  const live = selfServeCheckoutLive();
  const shownPlans = plans.map((plan) => (live && purchasable[plan.name] ? { ...plan, ...purchasable[plan.name] } : plan));
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
          {shownPlans.map((plan) => (
            <article className={`pricing-card${plan.lead ? " pricing-card--lead" : ""}`} key={plan.name}>
              <span className="pricing-label">{plan.availability}</span>
              <h2>{plan.name}</h2>
              <p className="pricing-summary"><strong>{plan.price}</strong></p>
              <p className="pricing-summary">{plan.summary}</p>
              <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={`button ${plan.lead ? "button--ink" : "button--outline"}`} href={plan.href}>
                {plan.cta} <Arrow />
              </Link>
            </article>
          ))}
        </div>

        <div className="shell pricing-activation">
          <strong>{live ? "How buying works" : "Commercial status"}</strong>
          {live ? (
            <p>
              Create your workspace, run your first baseline on the free plan (5 buyer questions, 10 answers a month) or start a 7-day
              Core trial with no card, then choose Core or Signal in Settings → Billing. Checkout is handled by Paddle, our merchant of record, which
              issues your receipt and invoice and handles sales tax/VAT. Paid limits (25 or 100 buyer questions, more
              runs and providers) apply as soon as Paddle confirms the payment. Every first payment carries a
              7-day money-back guarantee, once per company. Cancel anytime from the billing portal; see the <Link href="/refund-policy">refund policy</Link>. Intelligence remains sales-led and custom-scoped.
            </p>
          ) : (
            <p>
              Founder-led design-partner pricing is being validated with real teams. The figures above are proposed
              monthly USD prices, not currently available checkout offers. The 25-question Core and 100-question Signal
              capacities describe planned paid entitlements, not current access: foundation beta access is limited to
              5 buyer questions unless a verified workspace entitlement grants more. Self-serve paid checkout is shown
              only when billing is configured for the workspace; creating a design-partner/private-beta workspace does
              not charge a card. Intelligence remains sales-led and custom-scoped.
            </p>
          )}
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
