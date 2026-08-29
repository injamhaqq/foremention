import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { createStripePortalSession, stripeBillingConfigured } from "@/lib/stripe-billing";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { external_customer_id: string | null };

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!stripeBillingConfigured()) return NextResponse.json({ error: "Self-serve billing is not configured." }, { status: 503 });
  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces do not have a billing portal." }, { status: 403 });
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const billingRows = await supabaseRest<BillingAccountRow[]>(
    `billing_accounts?select=external_customer_id&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  ).catch(() => []);
  const customerId = billingRows[0]?.external_customer_id;
  if (!customerId) return NextResponse.json({ error: "No verified billing customer exists for this workspace." }, { status: 409 });

  try {
    const session = await createStripePortalSession({ customerId, returnUrl: `${new URL(request.url).origin}/app/settings` });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing portal could not be opened." }, { status: 503 });
  }
}
