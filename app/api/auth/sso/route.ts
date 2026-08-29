import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { enterpriseSsoConfigured, startEnterpriseSso } from "@/lib/enterprise-sso";
import { isTrustedMutationOrigin } from "@/lib/request-security";

function safeNext(request: Request, value: string | null) {
  const origin = new URL(request.url).origin;
  const path = value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL?.trim() || origin).toString();
}

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!enterpriseSsoConfigured()) return NextResponse.json({ configured: false, state: "not configured" });
  return NextResponse.json({ configured: true, state: "configured", next: safeNext(request, new URL(request.url).searchParams.get("next")) });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!enterpriseSsoConfigured()) return NextResponse.json({ error: "SSO is not configured for this workspace." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { email?: string; next?: string };
  try {
    const result = await startEnterpriseSso(body.email || viewer.email, safeNext(request, body.next || "/app"));
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSO could not be started." }, { status: 400 });
  }
}
