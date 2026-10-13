/**
 * Chat08 commercial operations helpers (read-only, pure).
 *
 * - Maps EXISTING operator rows (public.commercial_events +
 *   public.company_organization_classifications) onto Chat08 proof-event
 *   candidates without upgrading them to verified facts.
 * - Summarizes founder service-time logs by account and category (CV-13).
 * - Evaluates 14/30/60/90-day payment/value/elapsed-renewal gates (CV-09/10/14, A22/A23).
 * - Projects multi-period cohort scenarios with churn, fees and settlement lag
 *   (scenario_not_receipt; never revenue).
 * - Classifies investor claims against their evidence (A24).
 *
 * Nothing here reads a database, calls Paddle, writes events or grants entitlements.
 */
import { EVENT_AUTHORITY } from "./commercial-proof-economics.mjs";

const DAY_MS = 86_400_000;
const isoMs = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : null;
const present = value => typeof value === "string" && value.trim().length >= 8;
const requireIso = (value, name) => {
  const ms = isoMs(value);
  if (ms === null) throw new TypeError(name + " must be an exact UTC ISO timestamp");
  return ms;
};
const bounded = (value, name, max = 1e9) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)
    throw new TypeError(name + " must be a finite nonnegative bounded number");
  return value;
};

/* ------------------------------------------------------------------ */
/* 1. Existing commercial_events -> proof-event candidates              */
/* ------------------------------------------------------------------ */

/**
 * Existing commercial_events.event_type values. The authoritative check
 * constraint is the union restored by 20260901000100_icp_category_evidence.sql
 * (a source contract test pins this map to it).
 */
export const EXISTING_COMMERCIAL_EVENT_MAP = Object.freeze({
  outreach_sent: { kind: null, reason: "activity_not_proof" },
  reply_received: { kind: null, reason: "activity_not_proof" },
  conversation_held: { kind: "interview_completed", requires: ["participantConfirmed", "evidenceRef"] },
  discovery_held: { kind: "interview_completed", requires: ["participantConfirmed", "evidenceRef"] },
  qualification_completed: { kind: null, reason: "activity_not_proof" },
  demo_held: { kind: null, reason: "demo_is_not_sale_or_value" },
  pilot_proposal_sent: { kind: "scoped_offer_delivered", requires: ["pilotScopeRef", "evidenceRef"] },
  proposal_sent: { kind: "scoped_offer_delivered", requires: ["pilotScopeRef", "evidenceRef"] },
  pilot_started: { kind: null, reason: "ambiguous_requires_owner_event" },
  pilot_completed: { kind: null, reason: "ambiguous_requires_owner_event" },
  security_review_started: { kind: null, reason: "activity_not_proof" },
  security_review_completed: { kind: null, reason: "activity_not_proof" },
  procurement_started: { kind: null, reason: "activity_not_proof" },
  procurement_completed: { kind: null, reason: "activity_not_proof" },
  negotiation_updated: { kind: null, reason: "activity_not_proof" },
  payment_verified: { kind: "payment_settled", requires: ["settlementRef", "amountCents"], billing: true },
  renewal_review: { kind: null, reason: "activity_not_proof" },
  renewal_verified: { kind: "renewal_payment_settled", requires: ["settlementRef", "amountCents"], billing: true },
  expansion_review: { kind: null, reason: "activity_not_proof" },
  expansion_verified: { kind: null, reason: "expansion_requires_billing_owner_event" },
  churn_verified: { kind: "continuation_decision_recorded", outcome: "cancel", requires: ["evidenceRef"] },
  win_loss_review: { kind: null, reason: "activity_not_proof" },
  customer_success_checkpoint: { kind: null, reason: "activity_not_proof" },
  customer_interview: { kind: "interview_completed", requires: ["participantConfirmed", "evidenceRef"] },
  objection_recorded: { kind: null, reason: "research_signal_not_proof" },
  lost_deal_recorded: { kind: "continuation_decision_recorded", outcome: "lost", requires: ["evidenceRef"] },
  feature_request_recorded: { kind: null, reason: "research_signal_not_proof" },
  use_case_validated: { kind: null, reason: "research_signal_not_proof" },
  referral_verified: { kind: null, reason: "referral_counted_in_channel_ledger_not_proof" },
});

/** Billing-provider source systems whose rows may come from the authoritative billing ledger. */
const BILLING_SOURCES = new Set(["paddle", "billing_provider"]);

/**
 * Maps one existing operator row to a proof-event CANDIDATE. The candidate is
 * always `confirmation: "unverified"`: only the authoritative owner (Chat03 for
 * payments, Chat04 for decisions, founder research ledger for interviews) can
 * promote it after checking the underlying receipt.
 *
 * @param row  commercial_events row joined to its commercial_accounts row:
 *   { id, event_type, source_system, external_reference, occurred_at,
 *     customer_organization_id, ...extra owner-supplied fields }
 * @param classification company_organization_classifications row or null
 */
export function mapExistingCommercialEvent(row, classification) {
  if (!row || typeof row !== "object") return { candidate: null, reason: "invalid_row" };
  const rule = EXISTING_COMMERCIAL_EVENT_MAP[row.event_type];
  if (!rule) return { candidate: null, reason: "unknown_event_type" };
  if (!rule.kind) return { candidate: null, reason: rule.reason };
  const kpiEligible = classification?.included_in_company_kpis === true
    && ["design_partner", "customer"].includes(classification?.classification);
  if (!kpiEligible) {
    return { candidate: null, reason: "organization_not_kpi_eligible",
      classification: classification?.classification ?? "unclassified" };
  }
  if (rule.billing && !BILLING_SOURCES.has(row.source_system))
    return { candidate: null, reason: "manual_payment_not_billing_ledger" };
  const candidate = {
    kind: rule.kind,
    eventId: typeof row.id === "string" ? row.id : null,
    organizationId: row.customer_organization_id ?? null,
    accountKind: "external_customer",
    authority: EVENT_AUTHORITY[rule.kind],
    confirmation: "unverified",
    occurredAt: typeof row.occurred_at === "string" ? row.occurred_at : null,
    evidenceRef: row.evidenceRef ?? row.external_reference ?? null,
    ...(rule.outcome ? { outcome: rule.outcome } : {}),
  };
  for (const field of ["participantConfirmed", "urgentJob", "currentSpendDocumented", "pilotScopeRef",
    "settlementRef", "amountCents", "servicePeriodEnd"]) {
    if (Object.hasOwn(row, field)) candidate[field] = row[field];
  }
  const missingFields = (rule.requires ?? []).filter(field => {
    const value = candidate[field];
    if (field === "participantConfirmed") return value !== true;
    if (field === "amountCents") return !Number.isSafeInteger(value) || value <= 0;
    return !present(value);
  });
  if (!present(candidate.organizationId)) missingFields.push("organizationId");
  return { candidate: Object.freeze(candidate), reason: "requires_owner_verification", missingFields };
}

/* ------------------------------------------------------------------ */
/* 2. Founder service-time log (CV-13)                                  */
/* ------------------------------------------------------------------ */

export const SERVICE_TIME_CATEGORIES = Object.freeze({
  acquisition: "acquisition",          // sourcing, outreach drafting, calls before acceptance
  research_interview: "acquisition",
  onboarding_setup: "setup",
  evidence_review: "recurring",
  support: "recurring",
  comparison: "recurring",
  incident: "recurring",
  retention_review: "recurring",
  reporting: "recurring",
  admin_internal: "internal",
});

export const RECURRING_HOURS_TARGET_PER_CLIENT_PER_28_DAYS = 4;

/**
 * Summarizes dated founder minutes for one window. Entries outside the window,
 * in the future, with unknown categories or invalid minutes are excluded and
 * reported. Internal/test/research accounts never receive client attribution.
 */
export function summarizeServiceTime(entries, { windowStartIso, windowEndIso, asOfIso, hourlyCostUsd }) {
  if (!Array.isArray(entries)) throw new TypeError("Expected entry array");
  const start = requireIso(windowStartIso, "windowStartIso");
  const end = requireIso(windowEndIso, "windowEndIso");
  const asOf = requireIso(asOfIso, "asOfIso");
  if (end <= start) throw new TypeError("windowEndIso must follow windowStartIso");
  bounded(hourlyCostUsd, "hourlyCostUsd", 10_000);
  const windowDays = (end - start) / DAY_MS;
  const accounts = new Map(), exclusions = [], seen = new Set();
  const totals = { acquisition: 0, setup: 0, recurring: 0, internal: 0 };
  for (const entry of entries) {
    const bucket = SERVICE_TIME_CATEGORIES[entry?.category];
    const at = isoMs(entry?.occurredAt);
    if (!bucket) { exclusions.push({ entryId: entry?.entryId ?? null, reason: "unknown_category" }); continue; }
    if (!Number.isSafeInteger(entry.minutes) || entry.minutes <= 0 || entry.minutes > 24 * 60) {
      exclusions.push({ entryId: entry.entryId ?? null, reason: "invalid_minutes" }); continue;
    }
    if (at === null || at > asOf) { exclusions.push({ entryId: entry.entryId ?? null, reason: "missing_or_future_date" }); continue; }
    if (at < start || at >= end) { exclusions.push({ entryId: entry.entryId ?? null, reason: "outside_window" }); continue; }
    if (!present(entry.entryId) || seen.has(entry.entryId)) {
      exclusions.push({ entryId: entry.entryId ?? null, reason: "missing_or_duplicate_entry_id" }); continue;
    }
    seen.add(entry.entryId);
    const external = entry.accountKind === "external_customer" && present(entry.organizationId);
    const effectiveBucket = bucket === "internal" ? "internal"
      : external || bucket === "acquisition" ? bucket : "internal";
    totals[effectiveBucket] += entry.minutes;
    if (!external || effectiveBucket === "internal") continue;
    if (!accounts.has(entry.organizationId))
      accounts.set(entry.organizationId, { organizationId: entry.organizationId, acquisition: 0, setup: 0, recurring: 0 });
    accounts.get(entry.organizationId)[bucket] += entry.minutes;
  }
  const perAccount = [...accounts.values()].map(a => {
    const recurringHours = a.recurring / 60;
    const recurringPer28Days = recurringHours * (28 / windowDays);
    return Object.freeze({
      organizationId: a.organizationId,
      acquisitionHours: a.acquisition / 60, setupHours: a.setup / 60, recurringHours,
      recurringHoursPer28Days: recurringPer28Days,
      withinRecurringTarget: recurringPer28Days <= RECURRING_HOURS_TARGET_PER_CLIENT_PER_28_DAYS,
      laborCostUsd: (a.acquisition + a.setup + a.recurring) / 60 * hourlyCostUsd,
    });
  });
  const founderMinutes = totals.acquisition + totals.setup + totals.recurring + totals.internal;
  return Object.freeze({
    windowDays, perAccount,
    founderHours: founderMinutes / 60,
    acquisitionHours: totals.acquisition / 60, setupHours: totals.setup / 60,
    recurringHours: totals.recurring / 60, internalHours: totals.internal / 60,
    founderLaborCostUsd: founderMinutes / 60 * hourlyCostUsd,
    accountsOverRecurringTarget: perAccount.filter(a => !a.withinRecurringTarget).map(a => a.organizationId),
    evidenceType: "founder_time_log", exclusions,
  });
}

/* ------------------------------------------------------------------ */
/* 3. 14/30/60/90-day gates                                             */
/* ------------------------------------------------------------------ */

/**
 * Gate targets come from Commercial_Backlog_18.csv CV-09/10/13/14 and
 * Foremention_Master_Backlog_29/24.csv A22/A23 acceptance text (via
 * Backlog_Source_Index.csv). They are cumulative and evaluated only after the
 * gate's elapsed day; before that the gate is `not_due` (never "on track").
 */
export const PROOF_GATES = Object.freeze([
  { day: 14, criteria: [
    ["qualifiedProspects", 25, "A22: 25 evidence-qualified accounts (ICP>=65 + dated trigger + lawful route)"],
    ["interviewCount", 8, "CV-09: 8 confirmed qualified interviews"],
    ["interviewsWithUrgentSpend", 5, "CV-09: 5 with documented urgent job and current spend"],
    ["pricingIcpDisposition", 1, "Founder disposition of agency/$299 vs SaaS/$3k-$6k hypotheses"],
  ] },
  { day: 30, criteria: [
    ["scopedOffers", 5, "CV-10: 5 real same-scope written offers, every decision recorded"],
    ["activatedDesignPartners", 3, "A22: 3-5 activated external partners"],
  ] },
  { day: 60, criteria: [
    ["comparableSecondCycleOrgs", 2, "A22: >=2 orgs with reviewed comparable second cycles"],
    ["accountsWithServiceTimeLogged", "activatedDesignPartners", "CV-13/A23: labor recorded for every activated account"],
  ] },
  { day: 90, criteria: [
    ["paidOrSignedPilotOrgs", 1, "A22: >=1 paid/signed commitment"],
    ["paidPilotOrgs", 3, "CV-10: 3 collected payments after gates"],
    ["elapsedRenewalOrgs", 1, "CV-14: paid renewal after an elapsed paid period"],
    ["continuationDecisionOrgs", "activatedDesignPartners", "A23: every account has a continuation decision"],
    ["accountsWithinRecurringTarget", "accountsWithServiceTimeLogged", "CV-13: recurring <=4h/client/4wk"],
  ] },
]);

/**
 * @param proof    output of summarizeCommercialProof (verified facts only)
 * @param service  output of summarizeServiceTime or null
 * @param inputs   { cohortStartIso, asOfIso, qualifiedProspects (from dated
 *                   prospect ledger, or null), pricingIcpDisposition (boolean
 *                   founder decision recorded) }
 */
export function evaluateProofGates(proof, service, { cohortStartIso, asOfIso, qualifiedProspects = null, pricingIcpDisposition = false }) {
  const start = requireIso(cohortStartIso, "cohortStartIso");
  const asOf = requireIso(asOfIso, "asOfIso");
  if (asOf < start) throw new TypeError("asOfIso precedes cohortStartIso");
  if (!proof || typeof proof !== "object") throw new TypeError("Expected proof summary");
  const elapsedDays = Math.floor((asOf - start) / DAY_MS);
  const actuals = {
    ...proof,
    qualifiedProspects: Number.isSafeInteger(qualifiedProspects) ? qualifiedProspects : null,
    pricingIcpDisposition: pricingIcpDisposition === true ? 1 : 0,
    accountsWithServiceTimeLogged: service ? service.perAccount.length : null,
    accountsWithinRecurringTarget: service ? service.perAccount.filter(a => a.withinRecurringTarget).length : null,
  };
  const gates = PROOF_GATES.map(gate => {
    const criteria = gate.criteria.map(([metric, target, source]) => {
      const required = typeof target === "string" ? actuals[target] : target;
      const actual = actuals[metric];
      let status;
      if (actual === null || actual === undefined || required === null || required === undefined) status = "unavailable";
      else if (typeof target === "string" && required === 0) status = "unavailable"; // no denominator: never vacuous pass
      else status = actual >= required ? "met" : "not_met";
      return Object.freeze({ metric, actual: actual ?? null, required: required ?? null, status, source });
    });
    const due = elapsedDays >= gate.day;
    const status = !due ? "not_due"
      : criteria.every(c => c.status === "met") ? "met"
      : criteria.some(c => c.status === "not_met") ? "not_met" : "unavailable";
    return Object.freeze({ day: gate.day, due, status, criteria });
  });
  return Object.freeze({ elapsedDays, gates, mrrCents: null, evidenceType: "verified_facts_only" });
}

/* ------------------------------------------------------------------ */
/* 4. Multi-period cohort scenario with churn and settlement lag        */
/* ------------------------------------------------------------------ */

/**
 * Period-by-period PLANNING scenario. Collected cash lags contracted value by
 * `settlementLagPeriods`; founder hours are compared with a capacity ceiling.
 * Pilots in `pilotPeriods` are one-off and never counted as recurring.
 */
export function cohortScenario({
  periods, newClientsPerPeriod, priceUsd, churnRate, collectionFraction = 1,
  feeRate, flatFeeUsd, refundRate = 0, providerCostUsd, setupHours, recurringHours,
  sellingHoursPerNewClient, acquisitionCashUsd, hourlyCostUsd, fixedCostUsd,
  founderCapacityHours, settlementLagPeriods = 0, pilotPeriods = 1,
}) {
  if (!Number.isSafeInteger(periods) || periods < 1 || periods > 60) throw new TypeError("periods must be 1..60");
  if (!Array.isArray(newClientsPerPeriod) || newClientsPerPeriod.length !== periods ||
    !newClientsPerPeriod.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 10_000))
    throw new TypeError("newClientsPerPeriod must list nonnegative integers per period");
  for (const [k, v] of Object.entries({ churnRate, collectionFraction, feeRate, refundRate })) bounded(v, k, 1);
  for (const [k, v] of Object.entries({ priceUsd, flatFeeUsd, providerCostUsd, setupHours, recurringHours,
    sellingHoursPerNewClient, acquisitionCashUsd, hourlyCostUsd, fixedCostUsd, founderCapacityHours })) bounded(v, k);
  if (!Number.isSafeInteger(settlementLagPeriods) || settlementLagPeriods < 0 || settlementLagPeriods > 3)
    throw new TypeError("settlementLagPeriods must be 0..3");
  if (!Number.isSafeInteger(pilotPeriods) || pilotPeriods < 0 || pilotPeriods > 12)
    throw new TypeError("pilotPeriods must be 0..12");
  const rows = [], cohorts = []; // cohorts: { size, age }
  const netCashByPeriod = new Array(periods + settlementLagPeriods).fill(0);
  let cumulativeCashUsd = 0, capacityBreachPeriod = null;
  for (let p = 0; p < periods; p++) {
    for (const c of cohorts) { c.size *= (1 - churnRate); c.age++; }
    cohorts.push({ size: newClientsPerPeriod[p], age: 0 });
    const active = cohorts.reduce((t, c) => t + c.size, 0);
    const pilotClients = cohorts.filter(c => c.age < pilotPeriods).reduce((t, c) => t + c.size, 0);
    const recurringClients = active - pilotClients;
    const newClients = newClientsPerPeriod[p];
    const contracted = active * priceUsd;
    const collected = contracted * collectionFraction;
    const fees = collected * feeRate + active * collectionFraction * flatFeeUsd;
    const refunds = collected * refundRate;
    const serviceHours = active * recurringHours + newClients * setupHours;
    const salesHours = newClients * sellingHoursPerNewClient;
    const founderHours = serviceHours + salesHours;
    const net = collected - fees - refunds;
    netCashByPeriod[p + settlementLagPeriods] += net;
    const cashOut = active * providerCostUsd + newClients * acquisitionCashUsd + fixedCostUsd;
    const cashIn = netCashByPeriod[p];
    cumulativeCashUsd += cashIn - cashOut;
    const contribution = net - active * providerCostUsd - serviceHours * hourlyCostUsd;
    const overCapacity = founderHours > founderCapacityHours;
    if (overCapacity && capacityBreachPeriod === null) capacityBreachPeriod = p + 1;
    rows.push(Object.freeze({
      period: p + 1, activeClients: active, pilotClients, recurringClients, newClients,
      contractedUsd: contracted, collectedUsd: collected, feesUsd: fees, refundsUsd: refunds,
      settledCashInUsd: cashIn, cashOutUsd: cashOut, cumulativeCashUsd,
      founderHours, overCapacity,
      deliveryContributionUsd: contribution,
      contributionAfterAcquisitionAndFixedUsd: contribution - newClients * (acquisitionCashUsd + sellingHoursPerNewClient * hourlyCostUsd) - fixedCostUsd,
      recurringRevenueRunRateUsd: recurringClients * priceUsd * collectionFraction,
    }));
  }
  return Object.freeze({ rows, capacityBreachPeriod, cashUnsettledAtEndUsd: netCashByPeriod.slice(periods).reduce((a, b) => a + b, 0),
    evidenceType: "scenario_not_receipt" });
}

/* ------------------------------------------------------------------ */
/* 5. Investor claim ledger (A24)                                       */
/* ------------------------------------------------------------------ */

const TRACTION_METRICS = new Set(["customers", "paying_customers", "mrr", "arr", "revenue", "retention",
  "renewals", "interviews", "pilots", "case_studies", "logos", "testimonials", "gross_margin", "cac"]);

/**
 * Classifies how a claim may be used. Traction metrics require first-party
 * receipts/records with source references and an as-of date. Forecasts and
 * research may only appear labelled as such. MRR/ARR additionally require a
 * recurring billing ledger reference; pilots never become MRR.
 */
export function classifyInvestorClaim(claim, asOfIso) {
  const asOf = requireIso(asOfIso, "asOfIso");
  if (!claim || typeof claim !== "object") return { usage: "reject", reason: "invalid_claim" };
  const refs = Array.isArray(claim.sourceRefs) ? claim.sourceRefs.filter(present) : [];
  const claimAsOf = isoMs(claim.asOf);
  const traction = TRACTION_METRICS.has(claim.metric);
  if (claim.evidenceType === "forecast" || claim.evidenceType === "scenario")
    return { usage: "forecast_labelled_only", reason: traction ? "traction_metric_forecast_is_not_traction" : "not_a_receipt" };
  if (claim.evidenceType === "research" || claim.evidenceType === "category_case")
    return { usage: "market_context_only", reason: "not_foremention_customer_evidence" };
  if (claim.evidenceType === "hypothesis") return { usage: "hypothesis_labelled_only", reason: "unvalidated" };
  if (!["receipt", "first_party_record", "legal_record"].includes(claim.evidenceType))
    return { usage: "reject", reason: "unknown_evidence_type" };
  if (!refs.length) return { usage: "reject", reason: "missing_source_reference" };
  if (claimAsOf === null || claimAsOf > asOf) return { usage: "reject", reason: "missing_or_future_as_of" };
  if (claim.includesInternalOrTestAccounts === true) return { usage: "reject", reason: "internal_or_test_accounts_included" };
  if (["mrr", "arr"].includes(claim.metric) && claim.recurringBillingLedger !== true)
    return { usage: "reject", reason: "mrr_requires_recurring_billing_ledger" };
  if (["case_studies", "logos", "testimonials"].includes(claim.metric) && !present(claim.consentRef))
    return { usage: "reject", reason: "publication_requires_specific_consent" };
  return { usage: traction ? "traction_with_citation" : "fact_with_citation", reason: "source_backed" };
}
