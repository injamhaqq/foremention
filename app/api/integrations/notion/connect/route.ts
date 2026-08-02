import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { notionOAuthReady } from "@/lib/notion-connector";
import { createOAuthState } from "@/lib/oauth-state";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer(); if (!viewer || viewer.mode === "demo") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Only an owner or admin can connect Notion." }, { status: 403 });
  if (!notionOAuthReady()) return NextResponse.json({ error: "Notion OAuth is not configured for this deployment." }, { status: 503 });
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/notion/callback`;
  const state = await createOAuthState("notion", context.organizationId, viewer.id, process.env.NOTION_OAUTH_STATE_SECRET || "");
  const query = new URLSearchParams({ client_id: process.env.NOTION_CLIENT_ID || "", response_type: "code", owner: "user", redirect_uri: redirectUri, state });
  return NextResponse.json({ data: { authorizationUrl: `https://api.notion.com/v1/oauth/authorize?${query}` } });
}
