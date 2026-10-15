// Oct 15: 7-day guarantee copy, checkout fallback for lost creates, and the
// Settings Plan card that reflects the real free / trial / paid plan.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { planCardView } = await import("../lib/plan-card.ts");
const { decideUnknownReservation, UNKNOWN_CHECKOUT_SEARCH_MINUTES } = await import("../lib/paddle-checkout-reconciliation.ts");

const now = new Date("2026-10-15T10:00:00Z");
const ORG = "11111111-1111-4111-8111-111111111111";
const RES = "22222222-2222-4222-8222-222222222222";
const TXN = "txn_" + "t".repeat(26);

test("plan card: no entitlement is the free plan", () => {
  const view = planCardView(null, null, now);
  assert.equal(view.kind, "free");
  assert.equal(view.title, "Free plan");
  assert.equal(view.buyerQuestions, 5);
});

test("plan card: live trial shows days left and no card", () => {
  const view = planCardView({ package_key: "core", status: "active", billing_source: "trial", expires_at: "2026-10-18T10:00:00Z", max_prompts: 25 }, null, now);
  assert.equal(view.kind, "trial");
  assert.match(view.state, /3 days left/);
  assert.equal(view.billing, "No card on file");
  assert.equal(view.buyerQuestions, 25);
});

test("plan card: expired trial falls back to free", () => {
  const view = planCardView({ package_key: "core", status: "active", billing_source: "trial", expires_at: "2026-10-14T10:00:00Z", max_prompts: 25 }, null, now);
  assert.equal(view.kind, "free");
});

test("plan card: verified Paddle Signal is paid; past_due is flagged", () => {
  const row = { package_key: "signal", status: "active", billing_source: "paddle", expires_at: "2026-11-15T10:00:00Z", max_prompts: 100 };
  const paid = planCardView(row, { provider: "paddle", state: "active" }, now);
  assert.equal(paid.kind, "paid");
  assert.equal(paid.title, "Signal");
  assert.equal(paid.buyerQuestions, 100);
  assert.equal(planCardView(row, { provider: "paddle", state: "past_due" }, now).kind, "past_due");
});

test("plan card: a non-billing source never reads as paid", () => {
  const view = planCardView({ package_key: "signal", status: "active", billing_source: "manual", expires_at: null, max_prompts: 100 }, null, now);
  assert.equal(view.kind, "granted");
  assert.equal(view.billing, "No charge");
});

const unknown = (minutesAgo, over = {}) => ({
  id: RES, organization_id: ORG, package_key: "core", billing_interval: "monthly",
  state: "uncertain", external_transaction_id: null,
  created_at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(), ...over,
});

test("fallback: a lost create is kept while it may still be settling", () => {
  assert.equal(decideUnknownReservation(unknown(UNKNOWN_CHECKOUT_SEARCH_MINUTES - 1), [], now).action, "keep");
});

test("fallback: nothing found at Paddle releases; unreadable Paddle never releases", () => {
  const released = decideUnknownReservation(unknown(30), [], now);
  assert.equal(released.action, "release");
  assert.equal(released.evidence, "released:not_created:" + RES);
  assert.equal(decideUnknownReservation(unknown(30), null, now).action, "manual_review");
});

test("fallback: exactly one matching transaction is adopted; several need review", () => {
  const txn = { id: TXN, status: "ready", custom_data: { organizationId: ORG, checkoutReservationId: RES } };
  assert.equal(decideUnknownReservation(unknown(30), [txn], now).action, "adopt");
  assert.equal(decideUnknownReservation(unknown(30), [txn, { ...txn, id: "txn_" + "u".repeat(26) }], now).action, "manual_review");
  assert.equal(decideUnknownReservation(unknown(30), [{ ...txn, custom_data: { organizationId: ORG, checkoutReservationId: "x" } }], now).action, "manual_review");
});

test("fallback: a reserved row with no transaction is also recoverable", () => {
  assert.equal(decideUnknownReservation(unknown(30, { state: "reserved" }), [], now).action, "release");
  assert.equal(decideUnknownReservation(unknown(30, { state: "ready", external_transaction_id: TXN }), [], now).action, "manual_review");
});

test("guarantee: 7-day copy on refund, terms, pricing and pay; no 14-day copy", () => {
  for (const file of ["refund-policy", "terms", "pricing", "pay"]) {
    const page = readFileSync(new URL(`../app/${file}/page.tsx`, import.meta.url), "utf8");
    assert.match(page, /7-day money-back guarantee/i, file);
    assert.doesNotMatch(page, /14-day|14 days/i, file);
  }
  const refund = readFileSync(new URL("../app/refund-policy/page.tsx", import.meta.url), "utf8");
  assert.match(refund, /once per company/i);
});
