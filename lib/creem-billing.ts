import type { BillingLifecycleState, VerifiedBillingEvent } from "./billing.ts";

const CREEM_PROD_API = "https://api.creem.io";
const CREEM_TEST_API = "https://test-api.creem.io";
const CHECKOUT_PACKAGES = new Set(["core", "signal"]);

export type CreemCheckoutPackage = "core" | "signal";
export type CreemBillingInterval = "monthly" | "annual";
export type ParsedCreemBillingEvent = Omit<VerifiedBillingEvent, "organizationId"> & {
  organizationId: string | null;
};

export type CreemCheckoutInput = {
  packageKey: CreemCheckoutPackage;
  billingInterval?: CreemBillingInterval;
  organizationId: string;
  customerEmail: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl?: string;
};

export type CreemPortalInput = {
  customerId: string;
  returnUrl?: string;
};

type CreemObject = Record<string, unknown>;

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function creemProductIdFor(packageKey: string, billingInterval: CreemBillingInterval = "monthly") {
  if (packageKey === "core" && billingInterval === "annual") return envValue("CREEM_CORE_ANNUAL_PRODUCT_ID");
  if (packageKey === "signal" && billingInterval === "annual") return envValue("CREEM_SIGNAL_ANNUAL_PRODUCT_ID");
  if (packageKey === "core") return envValue("CREEM_CORE_MONTHLY_PRODUCT_ID");
  if (packageKey === "signal") return envValue("CREEM_SIGNAL_MONTHLY_PRODUCT_ID");
  return null;
}

function creemEnvironment() {
  const environment = envValue("CREEM_ENVIRONMENT");
  return environment === "test" || environment === "live" ? environment : null;
}

function creemApiBase() {
  const environment = creemEnvironment();
  if (environment === "test") return CREEM_TEST_API;
  if (environment === "live") return CREEM_PROD_API;
  return null;
}

export function creemBillingConfigured() {
  if (process.env.BILLING_PROVIDER_ID !== "creem") return false;
  const environment = creemEnvironment();
  if (!environment) return false;
  if (process.env.NODE_ENV === "production" && environment !== "live") return false;
  if (environment === "live" && process.env.CREEM_LIVE_ENABLED !== "1") return false;
  if (!envValue("CREEM_API_KEY") || !envValue("CREEM_WEBHOOK_SECRET")) return false;
  return Boolean(
    creemProductIdFor("core", "monthly")
    || creemProductIdFor("core", "annual")
    || creemProductIdFor("signal", "monthly")
    || creemProductIdFor("signal", "annual"),
  );
}

function configuredProductEntries() {
  return [
    { packageKey: "core" as const, billingInterval: "monthly" as const, productId: creemProductIdFor("core", "monthly") },
    { packageKey: "core" as const, billingInterval: "annual" as const, productId: creemProductIdFor("core", "annual") },
    { packageKey: "signal" as const, billingInterval: "monthly" as const, productId: creemProductIdFor("signal", "monthly") },
    { packageKey: "signal" as const, billingInterval: "annual" as const, productId: creemProductIdFor("signal", "annual") },
  ].filter((entry): entry is { packageKey: CreemCheckoutPackage; billingInterval: CreemBillingInterval; productId: string } => Boolean(entry.productId));
}

export function creemPackageForProductId(productId: string | null) {
  if (!productId) return null;
  const matches = configuredProductEntries().filter((entry) => entry.productId === productId);
  const packages = Array.from(new Set(matches.map((entry) => entry.packageKey)));
  return packages.length === 1 ? packages[0] : null;
}

async function creemPost(path: string, body: Record<string, unknown>) {
  const base = creemApiBase();
  const apiKey = envValue("CREEM_API_KEY");
  if (!base || !apiKey) throw new Error("Creem billing is not configured.");
  const response = await fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as CreemObject;
  if (!response.ok) {
    const message = typeof payload.message === "string"
      ? payload.message
      : typeof payload.error === "string"
        ? payload.error
        : "Billing provider request failed.";
    throw new Error(message.slice(0, 240));
  }
  return payload;
}

export async function createCreemCheckoutSession(input: CreemCheckoutInput) {
  if (!CHECKOUT_PACKAGES.has(input.packageKey)) throw new Error("This package is not available for self-serve checkout.");
  const billingInterval = input.billingInterval || "monthly";
  const productId = creemProductIdFor(input.packageKey, billingInterval);
  if (!productId || !creemBillingConfigured()) throw new Error("Creem billing is not configured for this package and interval.");

  const customer = input.customerId?.startsWith("cust_")
    ? { id: input.customerId }
    : { email: input.customerEmail };
  const payload = await creemPost("/v1/checkouts", {
    product_id: productId,
    request_id: crypto.randomUUID(),
    units: 1,
    success_url: input.successUrl,
    customer,
    metadata: {
      organizationId: input.organizationId,
      packageKey: input.packageKey,
      billingInterval,
    },
  });
  if (typeof payload.id !== "string" || typeof payload.checkout_url !== "string") {
    throw new Error("Creem did not return a hosted checkout session.");
  }
  return { id: payload.id, url: payload.checkout_url };
}

export async function createCreemPortalSession(input: CreemPortalInput) {
  if (!creemBillingConfigured()) throw new Error("Creem billing is not configured.");
  if (!input.customerId.startsWith("cust_")) throw new Error("A verified Creem customer is required.");
  const payload = await creemPost("/v1/customers/billing", { customer_id: input.customerId });
  if (typeof payload.customer_portal_link !== "string") throw new Error("Creem did not return a customer portal link.");
  return { url: payload.customer_portal_link };
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

export async function verifyCreemWebhook(rawBody: string, signatureHeader: string | null) {
  const secret = envValue("CREEM_WEBHOOK_SECRET");
  if (!secret) throw new Error("Creem webhook verification is not configured.");
  const supplied = signatureHeader?.trim().toLowerCase() || "";
  if (!/^[a-f0-9]{64}$/.test(supplied)) throw new Error("Creem signature is invalid.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = bytesToHex(new Uint8Array(digest));
  if (!constantTimeEqual(expected, supplied)) throw new Error("Creem signature is invalid.");
  return true;
}

function objectValue(value: unknown): CreemObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as CreemObject : null;
}

function objectId(value: unknown) {
  if (typeof value === "string") return value;
  const object = objectValue(value);
  return object && typeof object.id === "string" ? object.id : null;
}

function productIdFrom(object: CreemObject) {
  const direct = objectId(object.product);
  if (direct) return direct;
  const subscription = objectValue(object.subscription);
  return objectId(subscription?.product);
}

function customerIdFrom(object: CreemObject) {
  const direct = objectId(object.customer);
  if (direct) return direct;
  const order = objectValue(object.order);
  return objectId(order?.customer);
}

function subscriptionIdFrom(object: CreemObject) {
  if (typeof object.id === "string" && object.id.startsWith("sub_")) return object.id;
  if (object.object === "subscription" && typeof object.id === "string") return object.id;
  return objectId(object.subscription);
}

function organizationIdFrom(object: CreemObject) {
  const candidates = [
    objectValue(object.metadata),
    objectValue(objectValue(object.subscription)?.metadata),
  ];
  for (const metadata of candidates) {
    const value = typeof metadata?.organizationId === "string" ? metadata.organizationId.trim().toLowerCase() : "";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
  }
  return null;
}

function subscriptionState(status: unknown): BillingLifecycleState | null {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "paused") return "paused";
  if (status === "canceled" || status === "expired") return "cancelled";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return null;
}

function occurredAtFrom(createdAt: unknown) {
  if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
    const milliseconds = createdAt > 10_000_000_000 ? createdAt : createdAt * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (typeof createdAt === "string") {
    const date = new Date(createdAt);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return null;
}

export function parseCreemBillingEvent(rawBody: string): ParsedCreemBillingEvent | null {
  let event: CreemObject;
  try { event = JSON.parse(rawBody) as CreemObject; } catch { throw new Error("Creem webhook body is invalid."); }
  const eventId = typeof event.id === "string" ? event.id : "";
  const eventType = typeof event.eventType === "string" ? event.eventType : "";
  const object = objectValue(event.object);
  if (!eventId || !object) throw new Error("Creem webhook body is invalid.");

  const ignored = new Set(["subscription.scheduled_cancel", "subscription.expired", "refund.created", "dispute.created"]);
  if (ignored.has(eventType)) return null;

  let state: BillingLifecycleState | null = null;
  if (eventType === "checkout.completed") {
    const subscription = objectValue(object.subscription);
    if (subscription?.status === "trialing") state = "trialing";
    else if (objectValue(object.order)?.status === "paid") state = "active";
    else return null;
  } else if (eventType === "subscription.active" || eventType === "subscription.paid") state = "active";
  else if (eventType === "subscription.trialing") state = "trialing";
  else if (eventType === "subscription.paused") state = "paused";
  else if (eventType === "subscription.canceled") state = "cancelled";
  else if (eventType === "subscription.past_due" || eventType === "subscription.unpaid") state = "past_due";
  else if (eventType === "subscription.update") state = subscriptionState(object.status);
  else return null;
  if (!state) return null;

  const productId = productIdFrom(object);
  const packageKey = creemPackageForProductId(productId);
  if (!packageKey) return null;

  const accessUntil = state === "cancelled" ? occurredAtFrom(object.current_period_end_date) : null;
  return {
    organizationId: organizationIdFrom(object),
    packageKey,
    state,
    externalCustomerId: customerIdFrom(object),
    externalSubscriptionId: subscriptionIdFrom(object),
    eventId,
    occurredAt: occurredAtFrom(event.created_at),
    ...(accessUntil ? { accessUntil } : {}),
  };
}
