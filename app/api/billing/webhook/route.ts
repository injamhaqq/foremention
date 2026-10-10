import { NextResponse } from "next/server";
import { entitlementGrantForBillingEvent, entitlementsForBillingEvent, type VerifiedBillingEvent } from "@/lib/billing";
import { billingProvider, reconcileBillingOrganization, type ParsedBillingProviderEvent } from "@/lib/billing-provider";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingReceiptRow = { provider: string; event_id: string; processed_at: string | null };
type BillingAccountIdentityRow = {
  organization_id: string;
  external_customer_id: string | null;
  external_subscription_id: string | null;
};

async function claimBillingEvent(event: VerifiedBillingEvent, provider: string) {
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
  return rows.length > 0;
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

async function processBillingEvent(event: VerifiedBillingEvent, provider: string) {
  const claimed = await claimBillingEvent(event, provider);
  if (!claimed) return { duplicate: true } as const;
  try {
    await applyBillingEventAtomic(event, provider);
    return { duplicate: false } as const;
  } catch (error) {
    await releaseBillingEvent(event, provider).catch(() => undefined);
    throw error;
  }
}

async function billingMutationResponse(event: VerifiedBillingEvent, provider: string) {
  try {
    const result = await processBillingEvent(event, provider);
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

export async function POST(request: Request) {
  const provider = billingProvider();
  if (!provider?.configured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  try {
    await provider.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Billing signature is invalid.",
    }, { status: 401 });
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

  const event: VerifiedBillingEvent = {
    ...parsed,
    organizationId,
  };
  return billingMutationResponse(event, provider.id);
}
