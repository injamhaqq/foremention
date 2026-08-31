import type { BillingLifecycleState, VerifiedBillingEvent } from "./billing.ts";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2026-02-25.clover";
const WEBHOOK_TOLERANCE_SECONDS = 300;
const CHECKOUT_PACKAGES = new Set(["core", "signal"]);

export type StripeCheckoutPackage = "core" | "signal";
export type StripeBillingInterval = "monthly" | "annual";

type CheckoutInput = {
  packageKey: StripeCheckoutPackage;
  billingInterval?: StripeBillingInterval;
  organizationId: string;
  customerEmail: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

type PortalInput = { customerId: string; returnUrl: string };
type StripeObject = Record<string, unknown>;

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function stripePriceIdFor(packageKey: string, billingInterval: StripeBillingInterval = "monthly") {
  if (packageKey === "core" && billingInterval === "annual") return envValue("STRIPE_CORE_ANNUAL_PRICE_ID");
  if (packageKey === "signal" && billingInterval === "annual") return envValue("STRIPE_SIGNAL_ANNUAL_PRICE_ID");
  if (packageKey === "core") return envValue("STRIPE_CORE_MONTHLY_PRICE_ID") || envValue("STRIPE_CORE_PRICE_ID");
  if (packageKey === "signal") return envValue("STRIPE_SIGNAL_MONTHLY_PRICE_ID") || envValue("STRIPE_SIGNAL_PRICE_ID");
  return null;
}

export function stripeBillingConfigured() {
  return process.env.BILLING_PROVIDER_ID === "stripe"
    && Boolean(envValue("STRIPE_SECRET_KEY"))
    && Boolean(envValue("STRIPE_WEBHOOK_SECRET"))
    && Boolean(
      stripePriceIdFor("core", "monthly")
      || stripePriceIdFor("signal", "monthly")
      || stripePriceIdFor("core", "annual")
      || stripePriceIdFor("signal", "annual"),
    );
}

async function stripePost(path: string, params: URLSearchParams) {
  const secret = envValue("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe billing is not configured.");
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": STRIPE_API_VERSION,
    },
    body: params,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as StripeObject;
  if (!response.ok) {
    const nested = payload.error && typeof payload.error === "object" ? payload.error as StripeObject : null;
    const message = nested && typeof nested.message === "string" ? nested.message : "Billing provider request failed.";
    throw new Error(message.slice(0, 240));
  }
  return payload;
}

export async function createStripeCheckoutSession(input: CheckoutInput) {
  if (!CHECKOUT_PACKAGES.has(input.packageKey)) throw new Error("This package is not available for self-serve checkout.");
  const billingInterval = input.billingInterval || "monthly";
  const priceId = stripePriceIdFor(input.packageKey, billingInterval);
  if (!priceId || !stripeBillingConfigured()) throw new Error("Stripe billing is not configured for this package and interval.");

  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: input.organizationId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "metadata[organizationId]": input.organizationId,
    "metadata[packageKey]": input.packageKey,
    "metadata[billingInterval]": billingInterval,
    "subscription_data[metadata][organizationId]": input.organizationId,
    "subscription_data[metadata][packageKey]": input.packageKey,
    "subscription_data[metadata][billingInterval]": billingInterval,
  });
  if (input.customerId) params.set("customer", input.customerId);
  else params.set("customer_email", input.customerEmail);

  const payload = await stripePost("/checkout/sessions", params);
  if (typeof payload.id !== "string" || typeof payload.url !== "string") throw new Error("Stripe did not return a hosted checkout session.");
  return { id: payload.id, url: payload.url };
}

export async function createStripePortalSession(input: PortalInput) {
  if (!stripeBillingConfigured()) throw new Error("Stripe billing is not configured.");
  if (!input.customerId.startsWith("cus_")) throw new Error("A verified Stripe customer is required.");
  const payload = await stripePost("/billing_portal/sessions", new URLSearchParams({
    customer: input.customerId,
    return_url: input.returnUrl,
  }));
  if (typeof payload.url !== "string") throw new Error("Stripe did not return a customer portal session.");
  return { url: payload.url };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null, now = new Date()) {
  const secret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("Stripe webhook verification is not configured.");
  if (!signatureHeader) throw new Error("Stripe signature is missing.");

  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t" && /^\d+$/.test(value || "")) timestamp = Number(value);
    if (key === "v1" && /^[a-f0-9]{64}$/i.test(value || "")) signatures.push((value || "").toLowerCase());
  }
  if (!timestamp || !signatures.length) throw new Error("Stripe signature is invalid.");
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) throw new Error("Stripe webhook timestamp is outside the allowed replay window.");

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = bytesToHex(new Uint8Array(digest));
  if (!signatures.some((signature) => constantTimeEqual(expected, signature))) throw new Error("Stripe signature is invalid.");
  return true;
}

function objectId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as StripeObject).id === "string") return (value as StripeObject).id as string;
  return null;
}

function nestedObject(value: unknown): StripeObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as StripeObject : null;
}

function usableMetadata(value: unknown) {
  const metadata = nestedObject(value);
  if (!metadata) return null;
  return typeof metadata.organizationId === "string" || typeof metadata.packageKey === "string" ? metadata : null;
}

function eventMetadata(object: StripeObject) {
  const direct = usableMetadata(object.metadata);
  if (direct) return direct;
  const subscriptionDetails = nestedObject(object.subscription_details);
  const directSubscriptionMetadata = usableMetadata(subscriptionDetails?.metadata);
  if (directSubscriptionMetadata) return directSubscriptionMetadata;
  const parent = nestedObject(object.parent);
  const parentSubscription = parent && nestedObject(parent.subscription_details);
  return usableMetadata(parentSubscription?.metadata);
}

function subscriptionIdFrom(object: StripeObject) {
  const parent = nestedObject(object.parent);
  const parentSubscriptionDetails = parent && nestedObject(parent.subscription_details);
  return objectId(object.subscription)
    || objectId(parentSubscriptionDetails?.subscription)
    || (typeof object.id === "string" && object.id.startsWith("sub_") ? object.id : null);
}

function lifecycleFromSubscriptionStatus(status: unknown, eventType: string): BillingLifecycleState | null {
  if (eventType === "customer.subscription.deleted") return "cancelled";
  if (eventType === "customer.subscription.paused") return "paused";
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "paused") return "paused";
  if (status === "canceled") return "cancelled";
  if (["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(String(status || ""))) return "past_due";
  return null;
}

export function parseStripeBillingEvent(rawBody: string): VerifiedBillingEvent | null {
  let event: StripeObject;
  try { event = JSON.parse(rawBody) as StripeObject; } catch { throw new Error("Stripe webhook body is invalid."); }
  const eventId = typeof event.id === "string" ? event.id : "";
  const eventType = typeof event.type === "string" ? event.type : "";
  const data = nestedObject(event.data);
  const object = data && nestedObject(data.object);
  if (!eventId || !object) throw new Error("Stripe webhook body is invalid.");

  const supported = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.resumed",
    "customer.subscription.paused",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]);
  if (!supported.has(eventType)) return null;

  const metadata = eventMetadata(object);
  const organizationId = typeof metadata?.organizationId === "string" ? metadata.organizationId.trim().toLowerCase() : "";
  const packageKey = typeof metadata?.packageKey === "string" ? metadata.packageKey.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) return null;
  if (!["core", "signal", "intelligence", "custom"].includes(packageKey)) return null;

  let state: BillingLifecycleState | null = null;
  if (eventType === "checkout.session.completed") {
    if (object.payment_status === "paid") state = "active";
    else if (object.payment_status === "no_payment_required" && subscriptionIdFrom(object)) state = "trialing";
    else return null;
  } else if (eventType === "invoice.paid") state = "active";
  else if (eventType === "invoice.payment_failed") state = "past_due";
  else state = lifecycleFromSubscriptionStatus(object.status, eventType);
  if (!state) return null;

  const externalCustomerId = objectId(object.customer);
  const externalSubscriptionId = subscriptionIdFrom(object);
  const occurredAt = typeof event.created === "number" && Number.isFinite(event.created)
    ? new Date(event.created * 1000).toISOString()
    : null;
  return {
    organizationId,
    packageKey: packageKey as VerifiedBillingEvent["packageKey"],
    state,
    externalCustomerId,
    externalSubscriptionId,
    eventId,
    occurredAt,
  };
}
