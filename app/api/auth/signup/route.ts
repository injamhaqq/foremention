import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session-cookies";
import { supabaseAuth } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password, confirmation, full_name } = (await request.json()) as { email?: string; password?: string; confirmation?: string; full_name?: string };
    if (!email || !password || !confirmation || !full_name) return NextResponse.json({ error: "Name, email, password, and password confirmation are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
    if (password !== confirmation) return NextResponse.json({ error: "The two passwords do not match." }, { status: 400 });
    const incomingOrigin = new URL(request.url).origin;
    const origin = /localhost|127\.0\.0\.1|\[::1\]/.test(incomingOrigin)
      ? incomingOrigin
      : (process.env.NEXT_PUBLIC_SITE_URL || incomingOrigin).replace(/\/$/, "");
    // This route calls the GoTrue REST endpoint directly, rather than the
    // Supabase JavaScript client. Its field names are snake_case. Sending the
    // client-library `options.emailRedirectTo` shape silently falls back to
    // the project default URL, which strands a confirmed user outside the
    // callback that creates their Foremention session.
    const normalizedEmail = email.trim().toLowerCase();
    const data = await supabaseAuth("signup", {
      email: normalizedEmail,
      password,
      data: { full_name: full_name.trim() },
      email_redirect_to: `${origin}/auth/callback`,
    });
    const user = data.user && typeof data.user === "object"
      ? data.user as { identities?: unknown[] }
      : null;
    // With email confirmation enabled, Supabase deliberately returns an
    // obfuscated user with no identities when the address is already
    // registered. Treating that as a new signup incorrectly tells the person
    // to wait for an email that will never arrive.
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      return NextResponse.json({
        ok: true,
        session: false,
        account_help: true,
        email: normalizedEmail,
        message: "This email may already be connected to Foremention. Sign in, or reset the password if you cannot access the account.",
      });
    }
    const token = String(data.access_token || "");
    if (!token) return NextResponse.json({
      ok: true,
      session: false,
      email: normalizedEmail,
      message: "We sent a confirmation link from Foremention to your work email.",
    });
    const response = NextResponse.json({ ok: true, session: true });
    setSessionCookies(response, {
      accessToken: token,
      expiresIn: Number(data.expires_in || 3600),
      refreshToken: String(data.refresh_token || ""),
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    if (/email rate limit|rate limit/i.test(message)) return NextResponse.json({ error: "Email delivery is temporarily limited by the email provider. Please wait a few minutes before trying again." }, { status: 429 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
