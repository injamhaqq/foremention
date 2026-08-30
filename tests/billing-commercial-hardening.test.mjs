import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const original = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
}

test.afterEach(restoreEnv);

test("annual checkout is available only when an explicit annual Stripe Price exists", async () => {
  const billing = await import("../lib/stripe-billing.ts");
  delete process.env.STRIPE_CORE_ANNUAL_PRICE_ID;
  process.env.STRIPE_CORE_PRICE_ID = "price_core_monthly";
  assert.equal(billing.stripePriceIdFor("core"), "price_core_monthly");
  assert.equal(billing.stripePriceIdFor("core", "annual"), null);
  process.env.STRIPE_CORE_ANNUAL_PRICE_ID = "price_core_annual";
  assert.equal(billing.stripePriceIdFor("core", "annual"), "price_core_annual");
});

test("checkout completion does not grant access for an unpaid session", async () => {
  const { parseStripeBillingEvent } = await import("../lib/stripe-billing.ts");
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const base = {
    id: "evt_checkout",
    type: "checkout.session.completed",
    data: { object: {
      id: "cs_123",
      customer: "cus_123",
      subscription: "sub_123",
      metadata: { organizationId, packageKey: "core" },
    } },
  };
  assert.equal(parseStripeBillingEvent(JSON.stringify({ ...base, data: { object: { ...base.data.object, payment_status: "unpaid" } } })), null);
  assert.equal(parseStripeBillingEvent(JSON.stringify({ ...base, data: { object: { ...base.data.object, payment_status: "no_payment_required" } } }))?.state, "trialing");
});

test("payment-failure grace is opt-in and defaults to immediate entitlement pause", async () => {
  const { entitlementGrantForBillingEvent } = await import("../lib/billing.ts");
  const event = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    packageKey: "signal",
    state: "past_due",
    eventId: "evt_failed",
  };
  delete process.env.BILLING_GRACE_PERIOD_DAYS;
  assert.deepEqual(entitlementGrantForBillingEvent(event, new Date("2026-08-30T00:00:00Z")), {
    status: "paused",
    expiresAt: null,
    gracePeriodEndsAt: null,
  });
  process.env.BILLING_GRACE_PERIOD_DAYS = "3";
  assert.deepEqual(entitlementGrantForBillingEvent(event, new Date("2026-08-30T00:00:00Z")), {
    status: "active",
    expiresAt: "2026-09-02T00:00:00.000Z",
    gracePeriodEndsAt: "2026-09-02T00:00:00.000Z",
  });
});

test("billing state, entitlement expiry and audit history are committed atomically", async () => {
  const [migration, webhook] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260830000400_billing_commercial_hardening.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /create table if not exists public\.billing_state_history/i);
  assert.match(migration, /create or replace function public\.apply_billing_event_atomic_v2/i);
  assert.match(migration, /insert into public\.billing_state_history/i);
  assert.match(migration, /expires_at = excluded\.expires_at/i);
  assert.match(migration, /grant execute on function public\.apply_billing_event_atomic_v2/i);
  assert.match(webhook, /rpc\/apply_billing_event_atomic_v2/);
  assert.match(webhook, /p_entitlement_expires_at/);
  assert.match(webhook, /p_grace_period_ends_at/);
});

test("recurring measurement stops when a grace entitlement expires", async () => {
  const dispatcher = await readFile(new URL("../lib/jobs/measurement-schedule-dispatcher.ts", import.meta.url), "utf8");
  assert.match(dispatcher, /expires_at/);
  assert.match(dispatcher, /new Date\(entitlement\.expires_at\)/);
});

test("checkout and status expose annual offers only through server-configured Price IDs", async () => {
  const [checkout, status] = await Promise.all([
    readFile(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/status/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(checkout, /billingInterval/);
  assert.match(checkout, /stripePriceIdFor\(packageKey, billingInterval\)/);
  assert.match(status, /checkoutOffers/);
  assert.doesNotMatch(checkout, /amount|unit_amount|price_data/);
});
