import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { exchangeNotionCode, saveNotionConnection } from "@/lib/notion-connector";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const viewer = await getViewer(); const settings = new URL("/app/settings?integration=notion", process.env.NEXT_PUBLIC_SITE_URL || request.url);
  if (!viewer || viewer.mode === "demo") return NextResponse.redirect(new URL("/login?next=/app/settings", settings));
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]); const url = new URL(request.url); const code = url.searchParams.get("code") || ""; const state = url.searchParams.get("state") || "";
  if (!context || (role !== "owner" && role !== "admin") || !code || !await verifyOAuthState(state, "notion", context.organizationId, viewer.id, process.env.NOTION_OAUTH_STATE_SECRET || "")) { settings.searchParams.set("status", "invalid"); return NextResponse.redirect(settings); }
  try { const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/notion/callback`; await saveNotionConnection(context.organizationId, context.projectId, viewer.id, await exchangeNotionCode(code, redirectUri)); settings.searchParams.set("status", "connected"); } catch { settings.searchParams.set("status", "failed"); }
  return NextResponse.redirect(settings);
}
