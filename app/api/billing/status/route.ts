import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider, billingProviderTransitionAllowed } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";
import { buyerQuestionLimit } from "@/lib/product-limits";

type BillingAccountRow = { provider: string; state: string; external_customer_id: string | null; grace_period_ends_at: string | null };
type EntitlementRow = {
  package_key: string;
  status: string;
  expires_at: string | null;
  billing_source?: string | null;
  max_prompts?: number | null;
};
type ReservationRow = { state: string; created_at: string };

export async function GET() {
  const viewer = await requireViewer("/app/settings");
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (viewer.mode === "demo") {
    return NextResponse.json({ data: {
      configured: false,
      providerId: null,
      owner: false,
      state: "demo",
      packageKey: "private_beta",
      entitlementStatus: "active",
      entitlementExpiresAt: null,
      gracePeriodEndsAt: null,
      canManage: false,
      checkoutPackages: [],
      checkoutOffers: [],
      checkoutPending: null,
      buyerQuestionLimit: null,
    } });
  }

  let billingRows: BillingAccountRow[];
  let entitlementRows: EntitlementRow[];
  try {
    [billingRows, entitlementRows] = await Promise.all([
      supabaseRest<BillingAccountRow[]>(
        "billing_accounts?select=provider,state,external_customer_id,grace_period_ends_at&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
        { token: viewer.accessToken },
      ),
      supabaseRest<EntitlementRow[]>(
        "organization_entitlements?select=package_key,status,expires_at,billing_source,max_prompts&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
        { token: viewer.accessToken },
      ),
    ]);
  } catch {
    return NextResponse.json({ error: "Billing status could not be verified." }, { status: 503 });
  }
  const billing = billingRows[0];
  const entitlement = entitlementRows[0];
  const provider = billingProvider();
  const configured = Boolean(provider?.configured());

  // A checkout that was opened but is not yet confirmed by a signed provider
  // event. It is shown as pending and NEVER as paid access (Chat03).
  let checkoutPending: { state: string; createdAt: string } | null = null;
  if (configured && provider?.id === "paddle" && role === "owner") {
    try {
      const reservations = await supabaseRest<ReservationRow[]>(
        "billing_checkout_reservations?select=state,created_at&provider=eq.paddle&state=neq.reconciled&organization_id=eq."
          + encodeURIComponent(context.organizationId) + "&limit=1",
        { serviceRole: true },
      );
      if (reservations[0]) checkoutPending = { state: reservations[0].state, createdAt: reservations[0].created_at };
    } catch {
      return NextResponse.json({ error: "Billing status could not be verified." }, { status: 503 });
    }
  }
  const transitionAllowed = provider
    ? billingProviderTransitionAllowed(
      provider.id,
      billing?.provider,
      billing?.state,
      entitlement?.status,
      entitlement?.expires_at,
    )
    : false;
  const checkoutOffers = configured && transitionAllowed && !checkoutPending && role === "owner" && provider ? provider.checkoutOffers() : [];
  const checkoutPackages = Array.from(new Set(checkoutOffers.map((offer) => offer.packageKey)));

  return NextResponse.json({ data: {
    configured,
    providerId: provider?.id || null,
    owner: role === "owner",
    state: billing?.state || "unconfigured",
    packageKey: entitlement?.package_key || "private_beta",
    entitlementStatus: entitlement?.status || "active",
    entitlementExpiresAt: entitlement?.expires_at || null,
    gracePeriodEndsAt: billing?.grace_period_ends_at || null,
    canManage: configured
      && role === "owner"
      && Boolean(provider)
      && billing?.provider === provider?.id
      && Boolean(billing.external_customer_id),
    checkoutPackages,
    checkoutOffers,
    checkoutPending,
    // Effective server-side buyer-question ceiling (A03): verified-billing or
    // explicit grant only; anything else fails closed to Foundation access.
    buyerQuestionLimit: buyerQuestionLimit(entitlement),
  } });
}
