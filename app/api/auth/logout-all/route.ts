import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { clearSessionCookies, SESSION_COOKIE } from "@/lib/session-cookies";
import { SupabaseAuthError, supabaseSignOut } from "@/lib/supabase-rest";
import { correlationIdFor, logOperationalEvent } from "@/lib/structured-logger";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const correlationId = correlationIdFor(request);
  const store = await cookies();
  const accessToken = store.get(SESSION_COOKIE)?.value;

  if (!accessToken) {
    const response = NextResponse.redirect(new URL("/login?reason=session_expired", request.url), 303);
    clearSessionCookies(response);
    response.headers.set("cache-control", "private, no-store");
    return response;
  }

  try {
    await supabaseSignOut(accessToken, "global");
    logOperationalEvent("auth_all_sessions_revoked", { correlationId, route: "/api/auth/logout-all", method: "POST", status: 204 });
    const response = NextResponse.redirect(new URL("/login?reason=all_sessions_revoked", request.url), 303);
    clearSessionCookies(response);
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    const status = error instanceof SupabaseAuthError ? error.status : 500;
    logOperationalEvent("auth_all_sessions_revoke_failed", {
      correlationId,
      route: "/api/auth/logout-all",
      method: "POST",
      status,
      errorCode: error instanceof SupabaseAuthError ? error.code || "global_signout_failed" : "global_signout_failed",
    });

    // If the current Auth session is already invalid, clear this browser but do
    // not claim that every other device was revoked by this request.
    if (status === 401 || status === 403) {
      const response = NextResponse.redirect(new URL("/login?reason=session_expired", request.url), 303);
      clearSessionCookies(response);
      response.headers.set("cache-control", "private, no-store");
      return response;
    }

    // A transient/rate-limit failure must not pretend global revocation worked.
    // Preserve the current browser session so the customer can retry from Settings.
    const response = NextResponse.redirect(new URL("/app/settings?session_action=global_failed", request.url), 303);
    response.headers.set("cache-control", "private, no-store");
    return response;
  }
}
