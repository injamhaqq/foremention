/**
 * Settings Plan card (Oct 15): describe the workspace's real plan from the
 * stored entitlement and billing rows instead of a fixed "Foundation access /
 * Founder-granted / Billing not connected" card. Paid is shown only for an
 * active, unexpired entitlement written by a verified billing provider.
 */
import { CORE_TRIAL_CAPACITY, FOUNDATION_ACCESS_LIMITS, PACKAGE_CAPACITY, buyerQuestionLimit, coreTrialState } from "./product-limits.ts";

export type PlanEntitlementRow = {
  package_key?: string | null;
  status?: string | null;
  expires_at?: string | null;
  billing_source?: string | null;
  max_prompts?: number | null;
};
export type PlanBillingRow = { provider?: string | null; state?: string | null; grace_period_ends_at?: string | null };

export type PlanCardView = {
  kind: "free" | "trial" | "paid" | "past_due" | "granted";
  title: string;
  state: string;
  billing: string;
  brands: number;
  buyerQuestions: number;
  note: string;
};

const PAID_SOURCES = new Set(["paddle", "stripe", "creem"]);

function date(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function day(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function planCardView(entitlement: PlanEntitlementRow | null | undefined, billing: PlanBillingRow | null | undefined, now = new Date()): PlanCardView {
  const questions = buyerQuestionLimit(entitlement, now);
  const trial = coreTrialState(entitlement, now);
  if (trial) {
    return {
      kind: "trial",
      title: "Core trial",
      state: `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left · ends ${day(new Date(trial.endsAt))}`,
      billing: "No card on file",
      brands: 1,
      buyerQuestions: Math.max(questions, CORE_TRIAL_CAPACITY.buyerQuestions),
      note: "Choose Core or Signal in Billing to keep these limits. If you don't, the workspace returns to the free plan and nothing is charged.",
    };
  }
  const expires = date(entitlement?.expires_at);
  const live = entitlement?.status === "active" && (!expires || expires > now);
  const pkg = entitlement?.package_key === "core" || entitlement?.package_key === "signal" ? entitlement.package_key : null;
  if (live && pkg && entitlement?.billing_source && PAID_SOURCES.has(entitlement.billing_source)) {
    const pastDue = billing?.state === "past_due";
    const name = pkg === "core" ? "Core" : "Signal";
    return {
      kind: pastDue ? "past_due" : "paid",
      title: name,
      state: pastDue ? "Payment needs attention" : billing?.state === "cancelled" || billing?.state === "canceled" ? `Cancelled · access until ${expires ? day(expires) : "period end"}` : "Active",
      billing: expires ? `Paid through ${day(expires)}` : "Paid subscription",
      brands: PACKAGE_CAPACITY[pkg].brands,
      buyerQuestions: questions,
      note: pastDue
        ? "Update your payment method in Manage billing to keep paid limits."
        : "Manage invoices, payment method, or cancellation from Manage billing. Your first payment has a 7-day money-back guarantee.",
    };
  }
  const source = entitlement?.billing_source || null;
  if (live && !(source && PAID_SOURCES.has(source)) && source !== "trial" && source !== "trial_expired"
    && questions > FOUNDATION_ACCESS_LIMITS.buyerQuestions) {
    return {
      kind: "granted",
      title: pkg === "signal" ? "Signal (granted)" : pkg === "core" ? "Core (granted)" : "Granted access",
      state: expires ? `Active until ${day(expires)}` : "Active",
      billing: "No charge",
      brands: pkg ? PACKAGE_CAPACITY[pkg].brands : FOUNDATION_ACCESS_LIMITS.brands,
      buyerQuestions: questions,
      note: "Foremention granted this access directly. No card is charged.",
    };
  }
  return {
    kind: "free",
    title: "Free plan",
    state: entitlement?.billing_source === "trial_expired" ? "Trial ended" : "Active",
    billing: "No card on file",
    brands: FOUNDATION_ACCESS_LIMITS.brands,
    buyerQuestions: questions,
    note: "Upgrade to Core (25 questions) or Signal (100 questions) in Billing. Nothing is charged until you check out.",
  };
}
