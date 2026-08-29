import { NextResponse } from "next/server";
import { billingConfigured, entitlementsForBillingEvent, legacyEntitlementStatus, parseVerifiedBillingEvent, verifyBillingWebhook, type VerifiedBillingEvent } from "@/lib/billing";
import { parseStripeBillingEvent, stripeBillingConfigured, verifyStripeWebhook } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

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
    await applyBillingEvent(event, "stripe");
    return NextResponse.json({ received: true, eventId: event.eventId });
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
  await applyBillingEvent(event, provider);
  return NextResponse.json({ received: true, eventId: event.eventId });
}
