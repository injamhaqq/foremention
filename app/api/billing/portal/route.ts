import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider } from "@/lib/billing-provider";
import { billingPortalNoticePath, prefersHtmlNavigation, type BillingPortalNoticeCode } from "@/lib/billing-portal-notice";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type BillingAccountRow = { provider: string; external_customer_id: string | null };

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  // Browser form posts from Settings go back to Settings with a fixed notice
  // instead of rendering a bare JSON error page. JSON clients are unchanged.
  const html = prefersHtmlNavigation(request);
  const refuse = (code: BillingPortalNoticeCode, error: string, status: number) => html
    ? NextResponse.redirect(new URL(billingPortalNoticePath(code), request.url), 303)
    : NextResponse.json({ error }, { status });

  const provider = billingProvider();
  if (!provider?.configured()) return refuse("unavailable", "Self-serve billing is not configured.", 503);

  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return refuse("demo", "Demo workspaces do not have a billing portal.", 403);
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (role !== "owner") return refuse("owner_only", "Only the workspace owner can manage billing.", 403);
  if (!context) return refuse("workspace_missing", "Workspace not found.", 404);

  let billingRows: BillingAccountRow[];
  try {
    billingRows = await supabaseRest<BillingAccountRow[]>(
      "billing_accounts?select=provider,external_customer_id&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { token: viewer.accessToken },
    );
  } catch {
    // A database outage cannot be interpreted as "no billing customer".
    return refuse("verify_failed", "Billing portal ownership could not be verified.", 503);
  }
  const billing = billingRows[0];
  if (!billing?.external_customer_id || billing.provider !== provider.id) {
    return refuse("no_customer", "No verified billing customer exists for the active provider in this workspace.", 409);
  }

  try {
    const session = await provider.createPortal({
      customerId: billing.external_customer_id,
      returnUrl: new URL("/app/settings", request.url).toString(),
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    if (html) return refuse("provider_error", "Billing portal could not be opened.", 503);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing portal could not be opened." }, { status: 503 });
  }
}
