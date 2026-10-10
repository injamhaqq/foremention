import type { VerifiedBillingEvent } from "./billing.ts";
import {
  createCreemCheckoutSession,
  createCreemPortalSession,
  creemBillingConfigured,
  creemProductIdFor,
  parseCreemBillingEvent,
  verifyCreemWebhook,
  type CreemBillingInterval,
  type CreemCheckoutPackage,
  type ParsedCreemBillingEvent,
} from "./creem-billing.ts";
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  parseStripeBillingEvent,
  stripeBillingConfigured,
  stripePriceIdFor,
  verifyStripeWebhook,
  type StripeBillingInterval,
  type StripeCheckoutPackage,
} from "./stripe-billing.ts";

import {
  createPaddleCandidateCheckout,
  createPaddleCandidatePortal,
  paddleCandidateConfigured,
  paddlePriceIdFor,
  parsePaddleCandidateAdjustment,
  parsePaddleCandidateEvent,
  verifyPaddleCandidateWebhook,
} from "./paddle-billing.ts";

export type BillingProviderId = "stripe" | "creem" | "paddle";
export type BillingCheckoutPackage = "core" | "signal";
export type BillingInterval = "monthly" | "annual";
export type BillingCheckoutOffer = {
  packageKey: BillingCheckoutPackage;
  billingInterval: BillingInterval;
};
export type BillingCheckoutInput = {
  packageKey: BillingCheckoutPackage;
  billingInterval: BillingInterval;
  organizationId: string;
  customerEmail: string;
  customerId?: string | null;
  checkoutReservationId?: string | null;
  successUrl: string;
  cancelUrl: string;
};
export type BillingPortalInput = {
  customerId: string;
  returnUrl: string;
};
export type ParsedBillingProviderEvent = Omit<VerifiedBillingEvent, "organizationId"> & {
  organizationId: string | null;
  // Optional Paddle correlation. Never trust it without matching stored
  // service-created checkout or an established subscription identity.
  externalTransactionId?: string | null;
  transactionOrigin?: string | null;
  billingInterval?: BillingInterval;
};

export interface BillingProviderAdapter {
  readonly id: BillingProviderId;
  configured(): boolean;
  checkoutOffers(): BillingCheckoutOffer[];
  createCheckout(input: BillingCheckoutInput): Promise<{ id: string; url: string }>;
  createPortal(input: BillingPortalInput): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(rawBody: string): ParsedBillingProviderEvent | null;
  parseFinancialAdjustment?(rawBody: string): ReturnType<typeof parsePaddleCandidateAdjustment>;
}

function stripeCheckoutOffers(): BillingCheckoutOffer[] {
  const offers: BillingCheckoutOffer[] = [];
  for (const packageKey of ["core", "signal"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      if (stripePriceIdFor(packageKey, billingInterval)) offers.push({ packageKey, billingInterval });
    }
  }
  return offers;
}

function creemCheckoutOffers(): BillingCheckoutOffer[] {
  const offers: BillingCheckoutOffer[] = [];
  for (const packageKey of ["core", "signal"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      if (creemProductIdFor(packageKey, billingInterval)) offers.push({ packageKey, billingInterval });
    }
  }
  return offers;
}

// FM-09 sandbox integration ONLY. Production deliberately refuses Paddle even
// with live credentials or flags. FM-00 must authorize a separate live adapter
// after verified merchant/bank approval and durable financial controls.
function paddleSandboxConfigured() {
  return process.env.NODE_ENV !== "production"
    && process.env.PADDLE_ENVIRONMENT === "sandbox"
    && process.env.PADDLE_SANDBOX_ADAPTER_ENABLED === "1"
    && paddleCandidateConfigured();
}
function paddleSandboxCheckoutOffers(): BillingCheckoutOffer[] {
  const offers: BillingCheckoutOffer[] = [];
  for (const packageKey of ["core", "signal"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      if (paddlePriceIdFor(packageKey, billingInterval)) offers.push({ packageKey, billingInterval });
    }
  }
  return offers;
}
const paddleSandboxProvider: BillingProviderAdapter = {
  id: "paddle",
  configured: paddleSandboxConfigured,
  checkoutOffers: paddleSandboxCheckoutOffers,
  async createCheckout(input) {
    if (!paddleSandboxConfigured()) throw new Error("Paddle sandbox adapter is not enabled.");
    return createPaddleCandidateCheckout({
      packageKey: input.packageKey,
      billingInterval: input.billingInterval,
      organizationId: input.organizationId,
      customerId: input.customerId,
      checkoutReservationId: input.checkoutReservationId,
    });
  },
  async createPortal(input) {
    if (!paddleSandboxConfigured()) throw new Error("Paddle sandbox adapter is not enabled.");
    return createPaddleCandidatePortal(input.customerId);
  },
  async verifyWebhook(rawBody, headers) {
    if (!paddleSandboxConfigured()) throw new Error("Paddle sandbox adapter is not enabled.");
    return verifyPaddleCandidateWebhook(rawBody, headers.get("paddle-signature"));
  },
  parseWebhook(rawBody) {
    if (!paddleSandboxConfigured()) throw new Error("Paddle sandbox adapter is not enabled.");
    // Never respond with a falsely successful "ignored" result for a
    // financial adjustment. FM-05 must implement a durable case receipt
    // before enabling a production billing webhook for Paddle.
    if (parsePaddleCandidateAdjustment(rawBody)) {
      throw new Error("Paddle financial adjustment requires dedicated durable audit processing.");
    }
    return parsePaddleCandidateEvent(rawBody);
  },
  parseFinancialAdjustment(rawBody) {
    if (!paddleSandboxConfigured()) throw new Error("Paddle sandbox adapter is not enabled.");
    return parsePaddleCandidateAdjustment(rawBody);
  },
};

const stripeProvider: BillingProviderAdapter = {
  id: "stripe",
  configured: stripeBillingConfigured,
  checkoutOffers: stripeCheckoutOffers,
  createCheckout(input) {
    return createStripeCheckoutSession({
      ...input,
      packageKey: input.packageKey as StripeCheckoutPackage,
      billingInterval: input.billingInterval as StripeBillingInterval,
    });
  },
  createPortal: createStripePortalSession,
  verifyWebhook(rawBody, headers) {
    return verifyStripeWebhook(rawBody, headers.get("stripe-signature"));
  },
  parseWebhook(rawBody) {
    return parseStripeBillingEvent(rawBody);
  },
};

const creemProvider: BillingProviderAdapter = {
  id: "creem",
  configured: creemBillingConfigured,
  checkoutOffers: creemCheckoutOffers,
  createCheckout(input) {
    return createCreemCheckoutSession({
      ...input,
      packageKey: input.packageKey as CreemCheckoutPackage,
      billingInterval: input.billingInterval as CreemBillingInterval,
    });
  },
  createPortal: createCreemPortalSession,
  verifyWebhook(rawBody, headers) {
    return verifyCreemWebhook(rawBody, headers.get("creem-signature"));
  },
  parseWebhook(rawBody) {
    return parseCreemBillingEvent(rawBody) as ParsedCreemBillingEvent | null;
  },
};

export function billingProviderTransitionAllowed(
  _activeProvider: BillingProviderId,
  existingProvider: string | null | undefined,
  existingState: string | null | undefined,
  entitlementStatus?: string | null,
  entitlementExpiresAt?: string | null,
  now = new Date(),
) {
  if (!existingProvider || existingProvider === "unconfigured") return true;
  if (!existingState || existingState === "unconfigured") return true;
  if (existingState !== "cancelled") return false;

  if (entitlementStatus !== "active") return true;
  if (!entitlementExpiresAt) return false;
  const expiry = new Date(entitlementExpiresAt);
  return Number.isFinite(now.getTime())
    && Number.isFinite(expiry.getTime())
    && expiry <= now;
}

export function reconcileBillingOrganization(
  metadataOrganizationId: string | null | undefined,
  subscriptionOrganizationId: string | null | undefined,
  customerOrganizationId: string | null | undefined,
) {
  const mapped = Array.from(new Set(
    [subscriptionOrganizationId, customerOrganizationId].filter((value): value is string => Boolean(value)),
  ));
  if (mapped.length > 1) return null;
  if (mapped.length === 1) {
    if (metadataOrganizationId && metadataOrganizationId !== mapped[0]) return null;
    return mapped[0];
  }
  return metadataOrganizationId || null;
}

export function billingProviderId(): BillingProviderId | null {
  const provider = process.env.BILLING_PROVIDER_ID?.trim().toLowerCase();
  return provider === "stripe" || provider === "creem" || provider === "paddle" ? provider : null;
}

export function billingProvider(): BillingProviderAdapter | null {
  const provider = billingProviderId();
  if (provider === "stripe") return stripeProvider;
  if (provider === "creem") return creemProvider;
  if (provider === "paddle") return paddleSandboxProvider;
  return null;
}

export function billingProviderConfigured() {
  const provider = billingProvider();
  return Boolean(provider?.configured());
}
