import { NextResponse } from "next/server";
import { safeAuthNext } from "@/lib/google-auth";
import { clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from "@/lib/session-cookies";
import { SupabaseAuthError, supabaseAuth } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const safeNext = safeAuthNext(new URL(request.url).searchParams.get("next"));
  const refreshToken = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`))?.[1];

  if (!refreshToken) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext)}`, request.url), 303);
  }

  try {
    const data = await supabaseAuth("token?grant_type=refresh_token", {
      refresh_token: decodeURIComponent(refreshToken),
    });
    const accessToken = String(data.access_token || "");
    if (!accessToken) throw new Error("No refreshed session was returned.");

    const response = NextResponse.redirect(new URL(safeNext, request.url), 303);
    setSessionCookies(response, {
      accessToken,
      expiresIn: Number(data.expires_in || 3600),
      refreshToken: String(data.refresh_token || refreshToken),
    });
    return response;
  } catch (error) {
    if (error instanceof SupabaseAuthError && error.retryable) {
      // A transient GoTrue/database outage must not destroy a still-valid
      // refresh token. Preserve the cookies so the customer can retry later.
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(safeNext)}&reason=auth_temporarily_unavailable`, request.url),
        303,
      );
    }
    const response = NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(safeNext)}&reason=session_expired`, request.url),
      303,
    );
    clearSessionCookies(response);
    return response;
  }
}
