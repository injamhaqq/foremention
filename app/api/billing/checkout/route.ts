import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider, billingProviderTransitionAllowed, type BillingCheckoutPackage, type BillingInterval } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; state: string; external_customer_id: string | null };
type EntitlementRow = { status: string; expires_at: string | null };

function canonicalBillingOrigin() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredSiteUrl) throw new Error("Self-serve billing requires a canonical public site origin.");
  let origin: string;
  try {
    origin = new URL(configuredSiteUrl).origin;
  } catch {
    throw new Error("Self-serve billing requires a valid canonical public site origin.");
  }
  const parsed = new URL(origin);
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) throw new Error("Self-serve billing requires an HTTPS canonical public site origin.");
  return origin;
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const provider = billingProvider();
  if (!provider?.configured()) return NextResponse.json({ error: "Self-serve billing is not configured." }, { status: 503 });

  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces cannot start billing." }, { status: 403 });
  let role: Awaited<ReturnType<typeof getPrimaryWorkspaceRole>>;
  let context: Awaited<ReturnType<typeof loadWorkspaceContext>>;
  try {
    [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  } catch {
    // A database outage must fail closed with a retryable 503, never a bare 500.
    return NextResponse.json({ error: "Workspace authorization could not be verified." }, { status: 503 });
  }
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can start checkout." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";
  let packageKey = "";
  let billingInterval = "monthly";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json() as { packageKey?: string; billingInterval?: string };
      packageKey = String(body.packageKey || "").toLowerCase();
      billingInterval = String(body.billingInterval || "monthly").toLowerCase();
    } else {
      const form = await request.formData();
      packageKey = String(form.get("packageKey") || "").toLowerCase();
      billingInterval = String(form.get("billingInterval") || "monthly").toLowerCase();
    }
  } catch {
    return NextResponse.json({ error: "Checkout request is invalid." }, { status: 400 });
  }

  if (!(["core", "signal"] as string[]).includes(packageKey)) {
    return NextResponse.json({ error: "Choose Core or Signal for self-serve checkout." }, { status: 400 });
  }
  if (!(["monthly", "annual"] as string[]).includes(billingInterval)) {
    return NextResponse.json({ error: "Choose monthly or annual billing." }, { status: 400 });
  }
  const offerAvailable = provider.checkoutOffers().some(
    (offer) => offer.packageKey === packageKey && offer.billingInterval === billingInterval,
  );
  if (!offerAvailable) {
    return NextResponse.json({ error: "That package and billing interval are not configured for self-serve checkout." }, { status: 503 });
  }

  let billingRows: BillingAccountRow[];
  let entitlementRows: EntitlementRow[];
  try {
    [billingRows, entitlementRows] = await Promise.all([
      supabaseRest<BillingAccountRow[]>(
        "billing_accounts?select=provider,state,external_customer_id&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
        { token: viewer.accessToken },
      ),
      supabaseRest<EntitlementRow[]>(
        "organization_entitlements?select=status,expires_at&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
        { token: viewer.accessToken },
      ),
    ]);
  } catch {
    return NextResponse.json({ error: "Billing state could not be verified before checkout." }, { status: 503 });
  }

  let origin: string;
  try {
    origin = canonicalBillingOrigin();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Canonical billing origin is not configured." }, { status: 503 });
  }

  const existingBilling = billingRows[0];
  const entitlement = entitlementRows[0];
  if (!billingProviderTransitionAllowed(
    provider.id,
    existingBilling?.provider,
    existingBilling?.state,
    entitlement?.status,
    entitlement?.expires_at,
  )) {
    return NextResponse.json({
      error: "An existing non-terminal or paid-through billing lifecycle is already present. Manage or complete that billing lifecycle before starting another subscription.",
    }, { status: 409 });
  }
  const customerId = existingBilling?.provider === provider.id ? existingBilling.external_customer_id : null;

  // Paddle does not support client-supplied idempotency keys for arbitrary
  // transaction creates. A durable reservation MUST precede the HTTP call.
  // An uncertain create is never automatically released on a timer.
  let paddleReservationId: string | null = null;
  if (provider.id === "paddle") {
    paddleReservationId = crypto.randomUUID();
    let reserved: boolean;
    try {
      reserved = await supabaseRest<boolean>("rpc/reserve_paddle_checkout", {
        method: "POST",
        serviceRole: true,
        body: {
          p_reservation_id: paddleReservationId,
          p_organization_id: context.organizationId,
          p_package_key: packageKey,
          p_billing_interval: billingInterval,
        },
      });
    } catch {
      return NextResponse.json({ error: "The billing reservation could not be verified." }, { status: 503 });
    }
    if (!reserved) {
      return NextResponse.json({
        error: "An unresolved billing checkout already exists for this workspace. Contact support to reconcile it.",
      }, { status: 409 });
    }
  }

  try {
    const session = await provider.createCheckout({
      packageKey: packageKey as BillingCheckoutPackage,
      billingInterval: billingInterval as BillingInterval,
      organizationId: context.organizationId,
      customerEmail: viewer.email,
      customerId,
      checkoutReservationId: paddleReservationId,
      successUrl: origin + "/app/settings?billing=success",
      cancelUrl: origin + "/app/settings?billing=cancelled",
    });
    if (paddleReservationId) {
      const stored = await supabaseRest<boolean>("rpc/record_paddle_checkout_session", {
        method: "POST",
        serviceRole: true,
        body: {
          p_reservation_id: paddleReservationId,
          p_organization_id: context.organizationId,
          p_transaction_id: session.id,
          p_checkout_url: session.url,
        },
      });
      if (!stored) throw new Error("The Paddle checkout could not be reconciled.");
    }
    if (contentType.includes("application/json")) return NextResponse.json({ data: { url: session.url } });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    if (paddleReservationId) {
      // Never clear this reservation after a network error; Paddle may have
      // created a payable transaction even when its response was lost.
      await supabaseRest<boolean>("rpc/mark_paddle_checkout_uncertain", {
        method: "POST",
        serviceRole: true,
        body: {
          p_reservation_id: paddleReservationId,
          p_organization_id: context.organizationId,
        },
      }).catch(() => false);
      return NextResponse.json({
        error: "Paddle checkout needs reconciliation before a new attempt. Contact support.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status: 503 });
  }
}
