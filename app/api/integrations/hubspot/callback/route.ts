import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { exchangeHubSpotCode, saveHubSpotConnection, verifyHubSpotState } from "@/lib/hubspot-connector";

export async function GET(request: Request) {
  const viewer = await getViewer();
  const settings = new URL("/app/settings?integration=hubspot", process.env.NEXT_PUBLIC_SITE_URL || request.url);
  if (!viewer || viewer.mode === "demo") return NextResponse.redirect(new URL("/login?next=/app/settings", settings));
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  const url = new URL(request.url); const code = url.searchParams.get("code") || ""; const state = url.searchParams.get("state") || "";
  if (!context || (role !== "owner" && role !== "admin") || !code || !await verifyHubSpotState(state, context.organizationId, viewer.id, process.env.HUBSPOT_OAUTH_STATE_SECRET || "")) {
    settings.searchParams.set("status", "invalid"); return NextResponse.redirect(settings);
  }
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/hubspot/callback`;
    const tokens = await exchangeHubSpotCode(code, redirectUri);
    await saveHubSpotConnection(context.organizationId, context.projectId, viewer.id, tokens);
    settings.searchParams.set("status", "connected");
  } catch { settings.searchParams.set("status", "failed"); }
  return NextResponse.redirect(settings);
}
