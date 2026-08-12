import { NextResponse } from "next/server";
import { googleAuthEnabled, safeAuthNext } from "@/lib/google-auth";

function siteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { /* fall through */ }
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = siteOrigin(request);
  const next = safeAuthNext(requestUrl.searchParams.get("next"));

  if (!googleAuthEnabled()) {
    return NextResponse.redirect(new URL(`/login?reason=google_unavailable&next=${encodeURIComponent(next)}`, origin), 303);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return NextResponse.redirect(new URL(`/login?reason=google_unavailable&next=${encodeURIComponent(next)}`, origin), 303);
  }

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  const authorize = new URL("/auth/v1/authorize", supabaseUrl);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", callback.toString());

  const response = NextResponse.redirect(authorize, 303);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
