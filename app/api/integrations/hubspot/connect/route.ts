import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { createHubSpotState, hubSpotOAuthReady } from "@/lib/hubspot-connector";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer || viewer.mode === "demo") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Only an owner or admin can connect HubSpot." }, { status: 403 });
  if (!hubSpotOAuthReady()) return NextResponse.json({ error: "HubSpot OAuth is not configured for this deployment." }, { status: 503 });
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/hubspot/callback`;
  const state = await createHubSpotState(context.organizationId, viewer.id, process.env.HUBSPOT_OAUTH_STATE_SECRET || "");
  const query = new URLSearchParams({ client_id: process.env.HUBSPOT_CLIENT_ID || "", redirect_uri: redirectUri, scope: "oauth crm.objects.companies.read crm.objects.companies.write", state });
  return NextResponse.json({ data: { authorizationUrl: `https://app.hubspot.com/oauth/authorize?${query}` } });
}
