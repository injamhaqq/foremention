/**
 * The one public Foremention offer.
 *
 * Every price, trial and guarantee statement on the homepage, product page,
 * pricing page, checkout (/pay and Settings → Billing), Terms, refund policy
 * and llms-full.txt must agree with these values. Nothing here is new: prices
 * are the ones /pricing already published, capacities come from
 * lib/product-limits.ts (mirroring the billing_package_capacity_v1 trigger),
 * and the trial length is CORE_TRIAL_DAYS.
 *
 * tests/claims-offer-consistency.test.mjs fails when a surface drifts.
 * Pricing remains a hypothesis until validated (CLAUDE.md); changing a price
 * needs founder approval.
 */
import { CORE_TRIAL_CAPACITY, CORE_TRIAL_DAYS, FOUNDATION_ACCESS_DEFAULTS, PACKAGE_CAPACITY } from "./product-limits.ts";
import { CHECKOUT_TERMS_LINE, CORE_MONTHLY_PRICE, MONEY_BACK_DAYS, SIGNAL_MONTHLY_PRICE } from "./public-offer-prices.ts";

export { CHECKOUT_TERMS_LINE, MONEY_BACK_DAYS };

export const PUBLIC_PLANS = {
  free: {
    name: "Free",
    price: "$0",
    buyerQuestions: FOUNDATION_ACCESS_DEFAULTS.buyerQuestions,
    answersPerMonth: FOUNDATION_ACCESS_DEFAULTS.runUnitsPerMonth,
    brands: FOUNDATION_ACCESS_DEFAULTS.brands,
    cadence: "Run measurements yourself",
  },
  core: {
    name: "Core",
    price: CORE_MONTHLY_PRICE,
    buyerQuestions: PACKAGE_CAPACITY.core.buyerQuestions,
    brands: PACKAGE_CAPACITY.core.brands,
    cadence: `Automatic monthly re-measurement (weekly during the ${CORE_TRIAL_DAYS}-day trial)`,
  },
  signal: {
    name: "Signal",
    price: SIGNAL_MONTHLY_PRICE,
    buyerQuestions: PACKAGE_CAPACITY.signal.buyerQuestions,
    brands: PACKAGE_CAPACITY.signal.brands,
    cadence: "Automatic weekly re-measurement",
  },
  intelligence: {
    name: "Intelligence",
    price: "Custom",
    cadence: "Custom",
  },
} as const;

export const CORE_TRIAL = {
  days: CORE_TRIAL_DAYS,
  buyerQuestions: CORE_TRIAL_CAPACITY.buyerQuestions,
  providersPerRun: CORE_TRIAL_CAPACITY.providersPerRun,
} as const;

/** Founder-led route. One label everywhere a visitor is asked to talk to the team. */
export const PILOT_CTA_LABEL = "Request a pilot";
export const PRICING_CTA_LABEL = "See pricing";

export const TRIAL_PHRASE = `${CORE_TRIAL_DAYS}-day Core trial, no card required`;
export const GUARANTEE_PHRASE = `${MONEY_BACK_DAYS}-day money-back guarantee on a company's first payment, once per company`;

/** One sentence that is true whether or not self-serve checkout is live on a deployment. */
export const OFFER_SUMMARY =
  `Core is ${PUBLIC_PLANS.core.price.replace(" / ", "/")} and Signal is ${PUBLIC_PLANS.signal.price.replace(" / ", "/")}; Intelligence is custom-scoped. ` +
  `There is a free plan (${PUBLIC_PLANS.free.buyerQuestions} buyer questions), a ${TRIAL_PHRASE}, and a ${GUARANTEE_PHRASE}. ` +
  "Or request a founder-led pilot first.";
