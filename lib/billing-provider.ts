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

export type BillingProviderId = "stripe" | "creem";
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
  successUrl: string;
  cancelUrl: string;
};
export type BillingPortalInput = {
  customerId: string;
  returnUrl: string;
};
export type ParsedBillingProviderEvent = Omit<VerifiedBillingEvent, "organizationId"> & {
  organizationId: string | null;
};

export interface BillingProviderAdapter {
  readonly id: BillingProviderId;
  configured(): boolean;
  checkoutOffers(): BillingCheckoutOffer[];
  createCheckout(input: BillingCheckoutInput): Promise<{ id: string; url: string }>;
  createPortal(input: BillingPortalInput): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(rawBody: string): ParsedBillingProviderEvent | null;
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
) {
  if (!existingProvider || existingProvider === "unconfigured") return true;
  return !existingState || existingState === "unconfigured" || existingState === "cancelled";
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
  return provider === "stripe" || provider === "creem" ? provider : null;
}

export function billingProvider(): BillingProviderAdapter | null {
  const provider = billingProviderId();
  if (provider === "stripe") return stripeProvider;
  if (provider === "creem") return creemProvider;
  return null;
}

export function billingProviderConfigured() {
  const provider = billingProvider();
  return Boolean(provider?.configured());
}
