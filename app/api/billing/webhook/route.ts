import { NextResponse } from "next/server";
import { billingConfigured, entitlementsForBillingEvent, legacyEntitlementStatus, parseVerifiedBillingEvent, verifyBillingWebhook } from "@/lib/billing";
import { supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  const rawBody = await request.text();
  try {
    await verifyBillingWebhook(rawBody, request.headers.get("x-foremention-signature"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing signature is invalid." }, { status: 401 });
  }
  let event;
  try { event = parseVerifiedBillingEvent(rawBody); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Billing event is invalid." }, { status: 400 }); }

  const now = new Date().toISOString();
  const provider = process.env.BILLING_PROVIDER_ID as string;
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
  return NextResponse.json({ received: true, eventId: event.eventId });
}
