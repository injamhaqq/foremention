import { NextResponse } from "next/server";
import { clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from "@/lib/session-cookies";
import { supabaseAuth } from "@/lib/supabase-rest";

function safeNext(request: Request) {
  const candidate = new URL(request.url).searchParams.get("next") || "/app";
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/app";
}

export async function GET(request: Request) {
  const next = safeNext(request);
  const refreshToken = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`))?.[1];

  if (!refreshToken) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url), 303);
  }

  try {
    const data = await supabaseAuth("token?grant_type=refresh_token", {
      refresh_token: decodeURIComponent(refreshToken),
    });
    const accessToken = String(data.access_token || "");
    if (!accessToken) throw new Error("No refreshed session was returned.");

    const response = NextResponse.redirect(new URL(next, request.url), 303);
    setSessionCookies(response, {
      accessToken,
      expiresIn: Number(data.expires_in || 3600),
      refreshToken: String(data.refresh_token || refreshToken),
    });
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}&reason=session_expired`, request.url),
      303,
    );
    clearSessionCookies(response);
    return response;
  }
}
