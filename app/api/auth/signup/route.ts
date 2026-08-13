import { NextResponse } from "next/server";
import { getApplicationEmailStatus, sendWelcomeEmail } from "@/lib/application-email";
import { SupabaseAuthError, supabaseAuth } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";

async function attemptWelcomeEmail(email: string, origin: string) {
  if (!getApplicationEmailStatus().available) return "not_configured" as const;
  try {
    await sendWelcomeEmail(email, origin);
    return "sent" as const;
  } catch {
    // Welcome delivery is deliberately best-effort. Authentication and account
    // creation must not fail because the separate product-email provider is down.
    return "delivery_failed" as const;
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Send a valid signup form." }, { status: 400 });
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
    const fullName = cleanText(body.full_name, 120);
    if (!email || !password || !confirmation || !fullName) return NextResponse.json({ error: "Name, email, password, and password confirmation are required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) return NextResponse.json({ error: "Use at least 12 characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });
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
    const normalizedEmail = email;
    const data = await supabaseAuth("signup", {
      email: normalizedEmail,
      password,
      data: { full_name: fullName },
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
        account_help: true,
        email: normalizedEmail,
        error: "An account already exists with this email.",
      }, { status: 409 });
    }
    const welcomeEmail = await attemptWelcomeEmail(normalizedEmail, origin);
    const token = String(data.access_token || "");
    if (!token) return NextResponse.json({
      ok: true,
      session: false,
      email: normalizedEmail,
      welcome_email: welcomeEmail,
      message: "We sent a confirmation link from Foremention to your email.",
    });
    // Signup and sign-in remain separate journeys. Some Supabase projects
    // issue a session immediately when email confirmation is disabled. Never
    // turn that signup response into a Foremention login session.
    return NextResponse.json({
      ok: true,
      session: false,
      account_help: true,
      email: normalizedEmail,
      welcome_email: welcomeEmail,
      message: "Your account is ready. Sign in to continue to your workspace.",
    });
  } catch (error) {
    if (error instanceof SupabaseAuthError && error.retryable) {
      return NextResponse.json({ error: "Account creation is temporarily unavailable. No account changes were confirmed. Please try again in a moment." }, { status: error.status === 429 ? 429 : 503 });
    }
    const message = error instanceof Error ? error.message : "Could not create the account.";
    if (/email rate limit|rate limit/i.test(message)) return NextResponse.json({ error: "Email delivery is temporarily limited by the email provider. Please wait a few minutes before trying again." }, { status: 429 });
    if (/already registered|already exists|user already/i.test(message)) {
      return NextResponse.json({
        account_help: true,
        error: "An account already exists with this email.",
      }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
