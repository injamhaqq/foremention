import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; external_customer_id: string | null };

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const provider = billingProvider();
  if (!provider?.configured()) return NextResponse.json({ error: "Self-serve billing is not configured." }, { status: 503 });

  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces do not have a billing portal." }, { status: 403 });
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  let billingRows: BillingAccountRow[];
  try {
    billingRows = await supabaseRest<BillingAccountRow[]>(
      "billing_accounts?select=provider,external_customer_id&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { token: viewer.accessToken },
    );
  } catch {
    // A database outage cannot be interpreted as "no billing customer".
    return NextResponse.json({ error: "Billing portal ownership could not be verified." }, { status: 503 });
  }
  const billing = billingRows[0];
  if (!billing?.external_customer_id || billing.provider !== provider.id) {
    return NextResponse.json({ error: "No verified billing customer exists for the active provider in this workspace." }, { status: 409 });
  }

  try {
    const session = await provider.createPortal({
      customerId: billing.external_customer_id,
      returnUrl: new URL("/app/settings", request.url).toString(),
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing portal could not be opened." }, { status: 503 });
  }
}
