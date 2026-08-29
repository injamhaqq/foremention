import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { createStripeCheckoutSession, stripeBillingConfigured, type StripeCheckoutPackage } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { external_customer_id: string | null };

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!stripeBillingConfigured()) return NextResponse.json({ error: "Self-serve billing is not configured." }, { status: 503 });
  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces cannot start billing." }, { status: 403 });
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can start checkout." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";
  let packageKey = "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json() as { packageKey?: string };
      packageKey = String(body.packageKey || "").toLowerCase();
    } else {
      const form = await request.formData();
      packageKey = String(form.get("packageKey") || "").toLowerCase();
    }
  } catch {
    return NextResponse.json({ error: "Checkout request is invalid." }, { status: 400 });
  }
  if (!(["core", "signal"] as string[]).includes(packageKey)) return NextResponse.json({ error: "Choose Core or Signal for self-serve checkout." }, { status: 400 });

  const billingRows = await supabaseRest<BillingAccountRow[]>(
    `billing_accounts?select=external_customer_id&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  ).catch(() => []);
  const origin = new URL(request.url).origin;
  try {
    const session = await createStripeCheckoutSession({
      packageKey: packageKey as StripeCheckoutPackage,
      organizationId: context.organizationId,
      customerEmail: viewer.email,
      customerId: billingRows[0]?.external_customer_id || null,
      successUrl: `${origin}/app/settings?billing=success`,
      cancelUrl: `${origin}/app/settings?billing=cancelled`,
    });
    if (contentType.includes("application/json")) return NextResponse.json({ data: { url: session.url } });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status: 503 });
  }
}
