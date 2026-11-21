import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { billingProviderId, paddleLiveConfigured } from "@/lib/billing-provider";
import { getSiteHeaderAccount } from "@/lib/auth";
import { CORE_TRIAL, MONEY_BACK_DAYS, PILOT_CTA_LABEL, PUBLIC_PLANS } from "@/lib/public-offer";

// Purchasability is read from live billing configuration at request time.
export const dynamic = "force-dynamic";

function selfServeCheckoutLive() {
  return billingProviderId() === "paddle" && paddleLiveConfigured();
}

const purchasable: Record<string, { availability: string; cta: string; href: string }> = {
  Core: { availability: "7-day free trial · no card required", cta: "Start 7-day free trial", href: "/signup?next=%2Fapp%2Fsettings%3Ftrial%3Dcore%23billing" },
  Signal: { availability: "Monthly · cancel anytime", cta: "Start with Signal", href: "/signup?next=%2Fapp%2Fsettings%3Fplan%3Dsignal%23billing" },
};

function signedInHref(signupHref: string) {
  const next = new URL(signupHref, "https://foremention.com").searchParams.get("next") || "";
  return next.startsWith("/app/") ? next : "/app/settings#billing";
}

const PRICING_LIVE_DESCRIPTION =
  "Foremention Core ($99/month) and Signal ($299/month) with self-serve checkout through Paddle. Start a 7-day Core trial with no card; every first payment has a 7-day money-back guarantee, once per company.";
const PRICING_FOUNDER_LED_DESCRIPTION =
  "Foremention Core and Signal plans by buyer-question coverage, re-measurement cadence, and brands. Commercial terms are arranged with the Foremention team; Intelligence is custom-scoped.";

// Read at request time so the description never claims self-serve checkout
// when live billing is not configured for this deployment. /pricing is
// indexable and listed in the sitemap (FM-24); /pay stays noindex.
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Recommendation Intelligence Plans",
    description: selfServeCheckoutLive() ? PRICING_LIVE_DESCRIPTION : PRICING_FOUNDER_LED_DESCRIPTION,
    path: "/pricing",
  });
}

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
      "Automatic monthly re-measurement (weekly during the 7-day trial)",
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
      "Automatic weekly re-measurement",
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

// One row per question a buyer asks when comparing plans. Values come from
// lib/public-offer.ts, which reads lib/product-limits.ts.
const comparisonRows: Array<[string, string, string, string, string]> = [
  ["Price", PUBLIC_PLANS.free.price, PUBLIC_PLANS.core.price, PUBLIC_PLANS.signal.price, PUBLIC_PLANS.intelligence.price],
  ["Approved buyer questions", String(PUBLIC_PLANS.free.buyerQuestions), `Up to ${PUBLIC_PLANS.core.buyerQuestions}`, `Up to ${PUBLIC_PLANS.signal.buyerQuestions}`, "Custom"],
  ["Brands", String(PUBLIC_PLANS.free.brands), String(PUBLIC_PLANS.core.brands), `Up to ${PUBLIC_PLANS.signal.brands}`, "Multi-brand"],
  ["Re-measurement", PUBLIC_PLANS.free.cadence, PUBLIC_PLANS.core.cadence, PUBLIC_PLANS.signal.cadence, PUBLIC_PLANS.intelligence.cadence],
  ["Free trial", "Not needed", `${CORE_TRIAL.days} days, no card`, "No", "No"],
];

const billingFaq: Array<[string, string]> = [
  ["What happens when the Core trial ends?", `The ${CORE_TRIAL.days}-day trial takes no card. When it ends, the workspace returns to the free plan unless you choose Core or Signal. Nothing is charged automatically.`],
  ["Who bills me?", "Paddle, our merchant of record, runs checkout, issues your receipt and invoice, and handles sales tax or VAT. Foremention never sees your full card number."],
  ["Can I get my money back?", `Yes. Email hello@foremention.com within ${MONEY_BACK_DAYS} days of your company's first Core or Signal payment for a full refund. This applies once per company and not to renewals.`],
  ["How do I cancel?", "Open Settings → Billing → Manage billing at any time. Cancelling stops future renewals at the end of the current billing period."],
  ["Prefer to talk first?", "Request a founder-led pilot: bring five buyer questions and we review one real evidence cycle with you. Applying does not charge a card."],
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

export default async function PricingPage() {
  const account = await getSiteHeaderAccount();
  const live = selfServeCheckoutLive();
  const shownPlans = plans.map((plan) => {
    const offer = live ? purchasable[plan.name] : undefined;
    if (!offer) return plan;
    // A signed-in visitor goes straight to Billing instead of the signup form.
    return { ...plan, ...offer, href: account ? signedInHref(offer.href) : offer.href };
  });
  return (
    <PublicShell account={account}>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Recommendation Intelligence plans</span>
          <h1>Choose the evidence coverage your team needs.</h1>
          <p>
            Foremention packages the workflow around the things that actually change operating cost and value:
            buyer-question coverage, measurement frequency, brands, collaboration, integrations, and governance.
            Every plan keeps the same inspectable evidence standard.
          </p>
          {live ? (
            <p className="claims-pricing-lede">
              <strong>Start free, try Core for {CORE_TRIAL.days} days with no card, then pay monthly.</strong> Your first payment has a {MONEY_BACK_DAYS}-day money-back guarantee. Cancel anytime.
            </p>
          ) : null}
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

      <section className="section section--paper claims-pricing-compare" aria-labelledby="pricing-compare-title">
        <div className="shell">
          <h2 id="pricing-compare-title">Compare plans</h2>
          <div className="claims-table-scroll" role="region" aria-labelledby="pricing-compare-title" tabIndex={0}>
            <table className="claims-compare-table">
              <thead>
                <tr><th scope="col">Plan</th><th scope="col">Free</th><th scope="col">Core</th><th scope="col">Signal</th><th scope="col">Intelligence</th></tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, ...cells]) => (
                  <tr key={label}><th scope="row">{label}</th>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-caption">Prices are monthly, in US dollars, before any sales tax or VAT that Paddle adds at checkout.</p>

          <h2 className="claims-pricing-faq__title">Billing questions</h2>
          <div className="claims-pricing-faq">
            {billingFaq.map(([question, answer]) => (
              <details key={question}><summary>{question}</summary><p>{answer}</p></details>
            ))}
          </div>
          <p className="claims-pricing-pilot">
            <Link className="button button--outline" href="/contact">{PILOT_CTA_LABEL} <Arrow /></Link>
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
