import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { stripeBillingConfigured, stripePriceIdFor } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; state: string; external_customer_id: string | null };
type EntitlementRow = { package_key: string; status: string };

export async function GET() {
  const viewer = await requireViewer("/app/settings");
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (viewer.mode === "demo") {
    return NextResponse.json({ data: { configured: false, owner: false, state: "demo", packageKey: "private_beta", canManage: false, checkoutPackages: [] } });
  }

  const [billingRows, entitlementRows] = await Promise.all([
    supabaseRest<BillingAccountRow[]>(`billing_accounts?select=provider,state,external_customer_id&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken }).catch(() => []),
    supabaseRest<EntitlementRow[]>(`organization_entitlements?select=package_key,status&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken }).catch(() => []),
  ]);
  const billing = billingRows[0];
  const entitlement = entitlementRows[0];
  const configured = stripeBillingConfigured();
  return NextResponse.json({ data: {
    configured,
    owner: role === "owner",
    state: billing?.state || "unconfigured",
    packageKey: entitlement?.package_key || "private_beta",
    canManage: configured && role === "owner" && billing?.provider === "stripe" && Boolean(billing.external_customer_id),
    checkoutPackages: configured && role === "owner" ? (["core", "signal"] as const).filter((key) => Boolean(stripePriceIdFor(key))) : [],
  } });
}
