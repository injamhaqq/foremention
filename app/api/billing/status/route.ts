import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { stripeBillingConfigured, stripePriceIdFor, type StripeBillingInterval, type StripeCheckoutPackage } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; state: string; external_customer_id: string | null; grace_period_ends_at: string | null };
type EntitlementRow = { package_key: string; status: string; expires_at: string | null };
type CheckoutOffer = { packageKey: StripeCheckoutPackage; billingInterval: StripeBillingInterval };

function configuredCheckoutOffers(): CheckoutOffer[] {
  const offers: CheckoutOffer[] = [];
  for (const packageKey of ["core", "signal"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      if (stripePriceIdFor(packageKey, billingInterval)) offers.push({ packageKey, billingInterval });
    }
  }
  return offers;
}

export async function GET() {
  const viewer = await requireViewer("/app/settings");
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (viewer.mode === "demo") {
    return NextResponse.json({ data: { configured: false, owner: false, state: "demo", packageKey: "private_beta", entitlementStatus: "active", entitlementExpiresAt: null, gracePeriodEndsAt: null, canManage: false, checkoutPackages: [], checkoutOffers: [] } });
  }

  const [billingRows, entitlementRows] = await Promise.all([
    supabaseRest<BillingAccountRow[]>(`billing_accounts?select=provider,state,external_customer_id,grace_period_ends_at&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken }).catch(() => []),
    supabaseRest<EntitlementRow[]>(`organization_entitlements?select=package_key,status,expires_at&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken }).catch(() => []),
  ]);
  const billing = billingRows[0];
  const entitlement = entitlementRows[0];
  const configured = stripeBillingConfigured();
  const checkoutOffers = configured && role === "owner" ? configuredCheckoutOffers() : [];
  const checkoutPackages = Array.from(new Set(checkoutOffers.map((offer) => offer.packageKey)));
  return NextResponse.json({ data: {
    configured,
    owner: role === "owner",
    state: billing?.state || "unconfigured",
    packageKey: entitlement?.package_key || "private_beta",
    entitlementStatus: entitlement?.status || "active",
    entitlementExpiresAt: entitlement?.expires_at || null,
    gracePeriodEndsAt: billing?.grace_period_ends_at || null,
    canManage: configured && role === "owner" && billing?.provider === "stripe" && Boolean(billing.external_customer_id),
    checkoutPackages,
    checkoutOffers,
  } });
}
