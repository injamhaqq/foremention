import { NextResponse } from "next/server";
import { billingConfigured, entitlementsForBillingEvent, legacyEntitlementStatus, parseVerifiedBillingEvent, verifyBillingWebhook, type VerifiedBillingEvent } from "@/lib/billing";
import { parseStripeBillingEvent, stripeBillingConfigured, verifyStripeWebhook } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingReceiptRow = { provider: string; event_id: string; processed_at: string | null };

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

async function completeBillingEvent(event: VerifiedBillingEvent, provider: string) {
  await supabaseRest(
    `billing_webhook_events?provider=eq.${encodeURIComponent(provider)}&event_id=eq.${encodeURIComponent(event.eventId)}`,
    {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { processed_at: new Date().toISOString() },
    },
  );
}

async function releaseBillingEvent(event: VerifiedBillingEvent, provider: string) {
  await supabaseRest(
    `billing_webhook_events?provider=eq.${encodeURIComponent(provider)}&event_id=eq.${encodeURIComponent(event.eventId)}&processed_at=is.null`,
    { method: "DELETE", serviceRole: true, prefer: "return=minimal" },
  );
}

async function applyBillingEvent(event: VerifiedBillingEvent, provider: string) {
  const now = new Date().toISOString();
  const featureKeys = entitlementsForBillingEvent(event);
  await supabaseRest("billing_accounts?on_conflict=organization_id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      organization_id: event.organizationId,
      provider,
      external_customer_id: event.externalCustomerId || null,
      external_subscription_id: event.externalSubscriptionId || null,
      state: event.state,
      verified_webhook_at: now,
    },
  });
  await supabaseRest("organization_entitlements?on_conflict=organization_id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      organization_id: event.organizationId,
      plan: "free_beta",
      status: legacyEntitlementStatus(event.state),
      package_key: event.packageKey,
      feature_keys: featureKeys,
      billing_source: provider,
      effective_at: now,
    },
  });
}

async function processBillingEvent(event: VerifiedBillingEvent, provider: string) {
  const claimed = await claimBillingEvent(event, provider);
  if (!claimed) return { duplicate: true } as const;
  try {
    await applyBillingEvent(event, provider);
    await completeBillingEvent(event, provider);
    return { duplicate: false } as const;
  } catch (error) {
    // A failed mutation must remain retryable. Best-effort release avoids
    // permanently consuming the provider event id when no billing state landed.
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

export async function POST(request: Request) {
  const provider = process.env.BILLING_PROVIDER_ID?.trim() || "";
  const rawBody = await request.text();

  if (provider === "stripe") {
    if (!stripeBillingConfigured()) return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 503 });
    try {
      await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe signature is invalid." }, { status: 401 });
    }
    let event: VerifiedBillingEvent | null;
    try { event = parseStripeBillingEvent(rawBody); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe event is invalid." }, { status: 400 }); }
    if (!event) return NextResponse.json({ received: true, ignored: true });
    return billingMutationResponse(event, "stripe");
  }

  if (!billingConfigured()) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  try {
    await verifyBillingWebhook(rawBody, request.headers.get("x-foremention-signature"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing signature is invalid." }, { status: 401 });
  }
  let event: VerifiedBillingEvent;
  try { event = parseVerifiedBillingEvent(rawBody); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Billing event is invalid." }, { status: 400 }); }
  return billingMutationResponse(event, provider);
}
