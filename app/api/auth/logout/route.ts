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
  let reason = "signed_out";

  if (accessToken) {
    try {
      // Ordinary Sign out is deliberately local. Supabase's SDK/REST default is
      // global, so never omit the scope here or one click could revoke every
      // device unexpectedly.
      await supabaseSignOut(accessToken, "local");
      logOperationalEvent("auth_session_signed_out", { correlationId, route: "/api/auth/logout", method: "POST", status: 204 });
    } catch (error) {
      // The browser must still obey the customer's sign-out intent and remove
      // its local credentials. A transient upstream failure is disclosed on the
      // login screen because remote refresh-session cleanup was not confirmed.
      if (error instanceof SupabaseAuthError && error.retryable) reason = "signed_out_cleanup_unconfirmed";
      logOperationalEvent("auth_session_signout_unconfirmed", {
        correlationId,
        route: "/api/auth/logout",
        method: "POST",
        status: error instanceof SupabaseAuthError ? error.status : 500,
        errorCode: error instanceof SupabaseAuthError ? error.code || "auth_signout_failed" : "auth_signout_failed",
      });
    }
  }

  const response = NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url), 303);
  clearSessionCookies(response);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
