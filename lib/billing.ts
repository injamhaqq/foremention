import { packageCapabilities, type ForementionPackage } from "@/lib/entitlements";

export type BillingLifecycleState = "trialing" | "active" | "past_due" | "paused" | "cancelled";
export type VerifiedBillingEvent = {
  organizationId: string;
  packageKey: Exclude<ForementionPackage, "private_beta">;
  state: BillingLifecycleState;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  eventId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PACKAGES = new Set(["core", "signal", "intelligence", "custom"]);
const STATES = new Set<BillingLifecycleState>(["trialing", "active", "past_due", "paused", "cancelled"]);

export function billingConfigured() {
  return Boolean(process.env.BILLING_WEBHOOK_SECRET && process.env.BILLING_PROVIDER_ID);
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

export async function verifyBillingWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (!secret || !process.env.BILLING_PROVIDER_ID) throw new Error("Billing is not configured.");
  if (!signature) throw new Error("Billing signature is missing.");
  const supplied = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) throw new Error("Billing signature is invalid.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = bytesToHex(new Uint8Array(digest));
  if (!constantTimeEqual(expected, supplied)) throw new Error("Billing signature is invalid.");
  return true;
}

export function parseVerifiedBillingEvent(rawBody: string): VerifiedBillingEvent {
  let data: Record<string, unknown>;
  try { data = JSON.parse(rawBody) as Record<string, unknown>; } catch { throw new Error("Billing webhook body is invalid."); }
  const organizationId = String(data.organizationId || "").trim().toLowerCase();
  const packageKey = String(data.packageKey || "").trim().toLowerCase();
  const state = String(data.state || "").trim().toLowerCase() as BillingLifecycleState;
  const eventId = String(data.eventId || "").trim();
  if (!UUID.test(organizationId)) throw new Error("Billing organization is invalid.");
  if (!PACKAGES.has(packageKey)) throw new Error("Billing package is invalid.");
  if (!STATES.has(state)) throw new Error("Billing state is invalid.");
  if (!eventId || eventId.length > 160) throw new Error("Billing event id is invalid.");
  return {
    organizationId,
    packageKey: packageKey as VerifiedBillingEvent["packageKey"],
    state,
    externalCustomerId: typeof data.externalCustomerId === "string" ? data.externalCustomerId.slice(0, 255) : null,
    externalSubscriptionId: typeof data.externalSubscriptionId === "string" ? data.externalSubscriptionId.slice(0, 255) : null,
    eventId,
  };
}

export function entitlementsForBillingEvent(event: VerifiedBillingEvent) {
  return packageCapabilities(event.packageKey);
}

export function legacyEntitlementStatus(state: BillingLifecycleState): "active" | "paused" | "cancelled" {
  if (state === "cancelled") return "cancelled";
  if (state === "past_due" || state === "paused") return "paused";
  return "active";
}
