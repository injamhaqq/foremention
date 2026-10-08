import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider, billingProviderTransitionAllowed } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; state: string; external_customer_id: string | null; grace_period_ends_at: string | null };
type EntitlementRow = { package_key: string; status: string; expires_at: string | null };

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
    } });
  }

  const [billingRows, entitlementRows] = await Promise.all([
    supabaseRest<BillingAccountRow[]>(
      "billing_accounts?select=provider,state,external_customer_id,grace_period_ends_at&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { token: viewer.accessToken },
    ).catch(() => []),
    supabaseRest<EntitlementRow[]>(
      "organization_entitlements?select=package_key,status,expires_at&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { token: viewer.accessToken },
    ).catch(() => []),
  ]);
  const billing = billingRows[0];
  const entitlement = entitlementRows[0];
  const provider = billingProvider();
  const configured = Boolean(provider?.configured());
  const transitionAllowed = provider
    ? billingProviderTransitionAllowed(provider.id, billing?.provider, billing?.state)
    : false;
  const checkoutOffers = configured && transitionAllowed && role === "owner" && provider ? provider.checkoutOffers() : [];
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
  } });
}
