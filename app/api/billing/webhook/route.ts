import { NextResponse } from "next/server";
import { entitlementGrantForBillingEvent, entitlementsForBillingEvent, type VerifiedBillingEvent } from "@/lib/billing";
import { billingProvider, reconcileBillingOrganization, type BillingProviderAdapter, type ParsedBillingProviderEvent } from "@/lib/billing-provider";
import { supabaseRest } from "@/lib/supabase-rest";
import { paddleSubscriptionIdentityMatches } from "@/lib/paddle-lifecycle-admission";
import { reconcilePaddlePaidPeriod } from "@/lib/paddle-paid-period";
import { reservationAdmitsPaidTransaction } from "@/lib/paddle-checkout-reconciliation";
import { isProcessedBillingReceipt } from "@/lib/billing-webhook-receipt";
import { durableBillingInboxEnabled, enqueueVerifiedBillingEvent } from "@/lib/billing-verified-inbox";

type BillingReceiptRow = { provider: string; event_id: string; organization_id: string; processed_at: string | null };
type BillingAccountIdentityRow = {
  organization_id: string;
  external_customer_id: string | null;
  external_subscription_id: string | null;
};

async function claimBillingEvent(event: VerifiedBillingEvent, provider: string, fromVerifiedInbox = false) {
  const rows = await supabaseRest<BillingReceiptRow[]>("billing_webhook_events?on_conflict=provider,event_id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      provider,
      event_id: event.eventId,
      organization_id: event.organizationId,
    },
  });
  if (rows.length > 0) return true;
  // A uniqueness conflict may be a completed duplicate OR an interrupted,
  // still-pending receipt. Only an exact already-processed row permits 2xx.
  const previous = await supabaseRest<BillingReceiptRow[]>(
    "billing_webhook_events?select=provider,event_id,organization_id,processed_at"
      + "&provider=eq." + encodeURIComponent(provider)
      + "&event_id=eq." + encodeURIComponent(event.eventId) + "&limit=2",
    { serviceRole: true },
  );
  if (!isProcessedBillingReceipt(previous, {
    provider, eventId: event.eventId, organizationId: event.organizationId,
  })) {
    // A durable, signed-verified delivery with a fenced worker lease may
    // resume an interrupted receipt. The legacy synchronous HTTP handler
    // must never take this recovery path.
    if (fromVerifiedInbox && previous.length === 1
      && previous[0].provider === provider
      && previous[0].event_id === event.eventId
      && previous[0].organization_id === event.organizationId
      && previous[0].processed_at === null) return true;
    throw new Error("Billing receipt is pending, mismatched, or ambiguous; provider retry required.");
  }
  return false;
}

async function releaseBillingEvent(event: VerifiedBillingEvent, provider: string) {
  await supabaseRest(
    "billing_webhook_events?provider=eq." + encodeURIComponent(provider)
      + "&event_id=eq." + encodeURIComponent(event.eventId)
      + "&processed_at=is.null",
    { method: "DELETE", serviceRole: true, prefer: "return=minimal" },
  );
}

async function applyBillingEventAtomic(event: VerifiedBillingEvent, provider: string) {
  const grant = entitlementGrantForBillingEvent(event);
  const applied = await supabaseRest<boolean>("rpc/apply_billing_event_atomic_v2", {
    method: "POST",
    serviceRole: true,
    body: {
      p_provider: provider,
      p_event_id: event.eventId,
      p_organization_id: event.organizationId,
      p_package_key: event.packageKey,
      p_state: event.state,
      p_legacy_status: grant.status,
      p_feature_keys: entitlementsForBillingEvent(event),
      p_external_customer_id: event.externalCustomerId || null,
      p_external_subscription_id: event.externalSubscriptionId || null,
      p_entitlement_expires_at: grant.expiresAt,
      p_grace_period_ends_at: grant.gracePeriodEndsAt,
      p_effective_at: event.occurredAt || new Date().toISOString(),
    },
  });
  if (!applied) throw new Error("Verified billing event receipt was not available for atomic application.");
}

async function processBillingEvent(event: VerifiedBillingEvent, provider: string, fromVerifiedInbox = false) {
  const claimed = await claimBillingEvent(event, provider, fromVerifiedInbox);
  if (!claimed) return { duplicate: true } as const;
  try {
    await applyBillingEventAtomic(event, provider);
    return { duplicate: false } as const;
  } catch (error) {
    await releaseBillingEvent(event, provider).catch(() => undefined);
    throw error;
  }
}

/**
 * After a verified initial Paddle payment is applied, mark its checkout
 * reservation settled so the organization is not blocked from a later
 * checkout forever (Chat03). Best effort: entitlement is already durable, and
 * the owner/operator reconcile route settles any reservation left behind.
 */
async function settlePaddleReservation(event: VerifiedBillingEvent, settlement: PaddleSettlement | null) {
  if (!settlement) return;
  await supabaseRest<boolean>("rpc/settle_paddle_checkout_reservation", {
    method: "POST",
    serviceRole: true,
    body: {
      p_organization_id: event.organizationId,
      p_transaction_id: settlement.transactionId,
      p_evidence: "paid:" + settlement.transactionId,
    },
  }).catch(() => false);
}
type PaddleSettlement = { transactionId: string };

async function billingMutationResponse(event: VerifiedBillingEvent, provider: string, settlement: PaddleSettlement | null = null, fromVerifiedInbox = false) {
  try {
    const result = await processBillingEvent(event, provider, fromVerifiedInbox);
    await settlePaddleReservation(event, settlement);
    if (result.duplicate) return NextResponse.json({ received: true, duplicate: true, eventId: event.eventId });
    return NextResponse.json({ received: true, eventId: event.eventId });
  } catch {
    return NextResponse.json({ error: "Billing state could not be persisted. The provider may retry this event." }, { status: 503 });
  }
}

async function lookupBillingOrganization(
  provider: string,
  field: "external_subscription_id" | "external_customer_id",
  value: string | null | undefined,
) {
  if (!value) return null;
  const path = "billing_accounts?select=organization_id,external_customer_id,external_subscription_id"
    + "&provider=eq." + encodeURIComponent(provider)
    + "&" + field + "=eq." + encodeURIComponent(value)
    + "&limit=2";
  const rows = await supabaseRest<BillingAccountIdentityRow[]>(path, { serviceRole: true });
  return rows.length === 1 ? rows[0].organization_id : null;
}

async function resolveBillingOrganization(event: ParsedBillingProviderEvent, provider: string) {
  const [subscriptionOrganization, customerOrganization] = await Promise.all([
    lookupBillingOrganization(
      provider,
      "external_subscription_id",
      event.externalSubscriptionId,
    ),
    lookupBillingOrganization(
      provider,
      "external_customer_id",
      event.externalCustomerId,
    ),
  ]);

  return reconcileBillingOrganization(
    event.organizationId,
    subscriptionOrganization,
    customerOrganization,
  );
}

type PaddleReservationIdentityRow = {
  organization_id: string;
  package_key: string;
  billing_interval: string;
  state: string;
  reconciliation_evidence: string | null;
};
async function paddlePaidTransactionAdmitted(
  parsed: ParsedBillingProviderEvent,
  organizationId: string,
): Promise<boolean> {
  if (!parsed.externalTransactionId || !parsed.transactionOrigin || !parsed.externalSubscriptionId
    || !parsed.externalCustomerId || !parsed.billingInterval) return false;
  if (parsed.transactionOrigin === "api" || parsed.transactionOrigin === "web") {
    // New paid checkout must be one created by Foremention and durably bound
    // to this organization, package and interval before any paid entitlement.
    const rows = await supabaseRest<PaddleReservationIdentityRow[]>(
      "billing_checkout_reservations?select=organization_id,package_key,billing_interval,state,reconciliation_evidence"
      + "&provider=eq.paddle"
      + "&external_transaction_id=eq." + encodeURIComponent(parsed.externalTransactionId)
      + "&limit=2",
      { serviceRole: true },
    );
    return rows.length === 1 && reservationAdmitsPaidTransaction(rows[0], {
      organizationId,
      packageKey: parsed.packageKey,
      billingInterval: parsed.billingInterval,
      transactionId: parsed.externalTransactionId,
    });
  }
  if (parsed.transactionOrigin === "subscription_recurring"
    || parsed.transactionOrigin === "subscription_update") {
    // A recurring/upgrade charge has a new transaction ID. Do not grant
    // based on provider metadata or customer mapping alone; bind to the
    // previously verified exact subscription + customer of this workspace.
    const rows = await supabaseRest<BillingAccountIdentityRow[]>(
      "billing_accounts?select=organization_id,external_customer_id,external_subscription_id"
      + "&provider=eq.paddle"
      + "&external_subscription_id=eq." + encodeURIComponent(parsed.externalSubscriptionId)
      + "&limit=2",
      { serviceRole: true },
    );
    return paddleSubscriptionIdentityMatches(rows, organizationId, parsed.externalCustomerId, parsed.externalSubscriptionId);
  }
  return false;
}

/**
 * Paddle subscription-state events must be bound to an already verified
 * subscription AND customer. An organization ID in provider custom_data is
 * never sufficient to revoke or alter access; unresolved events receive a
 * retryable response until the upstream completed charge is reconciled.
 */
async function paddleSubscriptionLifecycleAdmitted(
  parsed: ParsedBillingProviderEvent,
  organizationId: string,
): Promise<boolean> {
  if (!parsed.externalSubscriptionId || !parsed.externalCustomerId) return false;
  const rows = await supabaseRest<BillingAccountIdentityRow[]>(
    "billing_accounts?select=organization_id,external_customer_id,external_subscription_id"
    + "&provider=eq.paddle"
    + "&external_subscription_id=eq." + encodeURIComponent(parsed.externalSubscriptionId)
    + "&limit=2",
    { serviceRole: true },
  );
  return paddleSubscriptionIdentityMatches(rows, organizationId, parsed.externalCustomerId, parsed.externalSubscriptionId);
}

type StoredPaddleEntitlementRow = { package_key: string; billing_source: string | null };

/**
 * Subscription state change for a subscription whose price left the current
 * catalog. Admit only by exact stored subscription+customer identity and take
 * the package from the persisted verified entitlement (never from metadata).
 */
async function paddleCatalogIndependentLifecycleResponse(
  lifecycle: NonNullable<ReturnType<NonNullable<BillingProviderAdapter["parseCatalogIndependentLifecycle"]>>>,
  fromVerifiedInbox = false,
) {
  let organizationId: string | null = null;
  let packageKey: "core" | "signal" | null = null;
  try {
    const rows = await supabaseRest<BillingAccountIdentityRow[]>(
      "billing_accounts?select=organization_id,external_customer_id,external_subscription_id"
      + "&provider=eq.paddle"
      + "&external_subscription_id=eq." + encodeURIComponent(lifecycle.externalSubscriptionId)
      + "&limit=2",
      { serviceRole: true },
    );
    // Not a subscription Foremention ever verified: not ours, nothing to change.
    if (rows.length === 0) return NextResponse.json({ received: true, ignored: true });
    if (rows.length === 1 && paddleSubscriptionIdentityMatches(
      rows, rows[0].organization_id, lifecycle.externalCustomerId, lifecycle.externalSubscriptionId,
    )) {
      organizationId = rows[0].organization_id;
      const entitlements = await supabaseRest<StoredPaddleEntitlementRow[]>(
        "organization_entitlements?select=package_key,billing_source&organization_id=eq."
          + encodeURIComponent(organizationId) + "&limit=1",
        { serviceRole: true },
      );
      const stored = entitlements[0];
      if (stored?.billing_source === "paddle" && (stored.package_key === "core" || stored.package_key === "signal")) {
        packageKey = stored.package_key;
      }
    }
  } catch {
    return NextResponse.json({ error: "Paddle subscription identity could not be verified. Provider retry required." }, { status: 503 });
  }
  if (!organizationId || !packageKey) {
    return NextResponse.json({
      error: "Paddle event has no matching reserved checkout or verified subscription identity. Provider retry required.",
    }, { status: 503 });
  }
  return billingMutationResponse({
    organizationId,
    packageKey,
    state: lifecycle.state,
    externalCustomerId: lifecycle.externalCustomerId,
    externalSubscriptionId: lifecycle.externalSubscriptionId,
    eventId: lifecycle.eventId,
    occurredAt: lifecycle.occurredAt,
  }, "paddle", null, fromVerifiedInbox);
}

export async function POST(request: Request) {
  const provider = billingProvider();
  if (!provider?.configured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }
  const rawBody = await request.text();
  // Reject unbounded payloads in both modes before any database access.
  if (new TextEncoder().encode(rawBody).length > 262144) {
    return NextResponse.json({ error: "Billing payload exceeds supported size." }, { status: 413 });
  }
  try {
    await provider.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Billing signature is invalid.",
    }, { status: 401 });
  }
  if (durableBillingInboxEnabled()) {
    try {
      const result = await enqueueVerifiedBillingEvent(rawBody, provider.id, process.env.PADDLE_ENVIRONMENT || "");
      // HTTP 200 confirms durable verified intake, never paid entitlement.
      return NextResponse.json({ received: true, queued: true, duplicate: result.duplicate, eventId: result.eventId });
    } catch {
      return NextResponse.json({ error: "Verified billing event could not be durably queued. Provider retry required." }, { status: 503 });
    }
  }
  return processVerifiedBillingWebhookRawBody(rawBody);
}

/**
 * Trusted internal worker entry: only call with raw bytes read from the
 * service-role verified inbox, which the public POST filled after authenticating
 * the provider signature. This function is not a public API endpoint.
 */
export async function processVerifiedBillingWebhookRawBody(rawBody: string, fromVerifiedInbox = false) {
  const provider = billingProvider();
  if (!provider?.configured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  // Financial adjustments are separate accounting cases, not entitlement
  // lifecycle events. Only acknowledge them after a durable, replay-safe
  // service-only receipt has been persisted for a verified billing customer.
  if (provider.parseFinancialAdjustment) {
    let adjustment: ReturnType<NonNullable<typeof provider.parseFinancialAdjustment>>;
    try {
      adjustment = provider.parseFinancialAdjustment(rawBody);
    } catch {
      return NextResponse.json({ error: "Billing financial adjustment event is invalid." }, { status: 400 });
    }
    if (adjustment) {
      try {
        const [subscriptionOrganization, customerOrganization] = await Promise.all([
          lookupBillingOrganization(provider.id, "external_subscription_id", adjustment.subscriptionId),
          lookupBillingOrganization(provider.id, "external_customer_id", adjustment.customerId),
        ]);
        const organizationId = reconcileBillingOrganization(
          null, subscriptionOrganization, customerOrganization,
        );
        if (!organizationId) {
          return NextResponse.json({
            error: "Financial adjustment identity could not be reconciled. Provider retry required.",
          }, { status: 503 });
        }
        const inserted = await supabaseRest<{ event_id: string }[]>(
          "billing_financial_adjustment_events?on_conflict=provider,event_id",
          {
            method: "POST",
            serviceRole: true,
            prefer: "resolution=ignore-duplicates,return=representation",
            body: {
              organization_id: organizationId,
              provider: provider.id,
              event_id: adjustment.eventId,
              adjustment_id: adjustment.adjustmentId,
              transaction_id: adjustment.transactionId,
              external_subscription_id: adjustment.subscriptionId,
              external_customer_id: adjustment.customerId,
              action: adjustment.action,
              status: adjustment.status,
              adjustment_type: adjustment.adjustmentType,
              event_type: adjustment.eventType,
              occurred_at: adjustment.occurredAt,
            },
          },
        );
        return NextResponse.json({ received: true, adjustment: true, duplicate: inserted.length === 0 });
      } catch {
        return NextResponse.json({
          error: "Financial adjustment case could not be persisted. Provider retry required.",
        }, { status: 503 });
      }
    }
  }

  let parsed: ParsedBillingProviderEvent | null;
  try {
    parsed = provider.parseWebhook(rawBody);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Billing event is invalid.",
    }, { status: 400 });
  }
  if (!parsed && provider.id === "paddle") {
    // Never acknowledge a Foremention payment we cannot map as "ignored".
    const unmapped = provider.unmappedPaidTransaction?.(rawBody) ?? null;
    if (unmapped) {
      return NextResponse.json({
        error: "Completed Paddle payment does not match a single configured Foremention offer. Operator review required; provider retry keeps it visible.",
      }, { status: 503 });
    }
    const lifecycle = provider.parseCatalogIndependentLifecycle?.(rawBody) ?? null;
    if (lifecycle) return paddleCatalogIndependentLifecycleResponse(lifecycle, fromVerifiedInbox);
  }
  if (!parsed) return NextResponse.json({ received: true, ignored: true });

  let organizationId: string | null;
  try {
    organizationId = await resolveBillingOrganization(parsed, provider.id);
  } catch {
    return NextResponse.json({
      error: "Billing identity could not be resolved. The provider may retry this event.",
    }, { status: 503 });
  }
  if (!organizationId) {
    return NextResponse.json({
      error: "Billing identity could not be resolved. The provider may retry this event.",
    }, { status: 503 });
  }

  let reconciledPaidThrough: string | null = null;
  if (provider.id === "paddle") {
    try {
      const admitted = parsed.externalTransactionId
        ? await paddlePaidTransactionAdmitted(parsed, organizationId)
        : await paddleSubscriptionLifecycleAdmitted(parsed, organizationId);
      if (!admitted) {
        return NextResponse.json({
          error: "Paddle event has no matching reserved checkout or verified subscription identity. Provider retry required.",
        }, { status: 503 });
      }
      // Paddle can send billing_period=null for the initial paid checkout.
      // A missing period must NEVER be interpreted as indefinitely paid.
      // Resolve it from the verified subscription after identity admission.
      if (parsed.externalTransactionId && !parsed.accessUntil) {
        if (!parsed.externalSubscriptionId || !parsed.externalCustomerId
          || !parsed.billingInterval || (parsed.packageKey !== "core" && parsed.packageKey !== "signal")) {
          throw new Error("Missing supported paid subscription identity.");
        }
        reconciledPaidThrough = await reconcilePaddlePaidPeriod({
          subscriptionId: parsed.externalSubscriptionId,
          customerId: parsed.externalCustomerId,
          packageKey: parsed.packageKey,
          billingInterval: parsed.billingInterval,
          occurredAt: parsed.occurredAt || "",
        });
      }
    } catch {
      return NextResponse.json({
        error: "Paddle event correlation or bounded paid period could not be verified. Provider retry required.",
      }, { status: 503 });
    }
  }

  const event: VerifiedBillingEvent = {
    ...parsed,
    ...(reconciledPaidThrough ? { accessUntil: reconciledPaidThrough } : {}),
    organizationId,
  };
  const settlement = provider.id === "paddle" && parsed.externalTransactionId
    && (parsed.transactionOrigin === "api" || parsed.transactionOrigin === "web")
    ? { transactionId: parsed.externalTransactionId }
    : null;
  return billingMutationResponse(event, provider.id, settlement, fromVerifiedInbox);
}
