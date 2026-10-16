import { isTrustedMutationOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { getApplicationEmailStatus, sendWelcomeEmail } from "@/lib/application-email";
import { safeAuthNext } from "@/lib/google-auth";
import { SupabaseAuthError, supabaseAuth } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";
import { checkPasswordSafety, HashRangeUnavailable, issueSignupSecurityAttestation } from "@/lib/password-safety";
import { AuthLinkError, authEmailDeliveryAvailable, generateAuthLink, sendSignupConfirmationEmail } from "@/lib/auth-email-delivery";

// Browser/API responses must not distinguish existing mailboxes from
// accounts eligible for registration. A request receipt is not proof of mail delivery.
const NEUTRAL_SIGNUP_MESSAGE =
  "If this email can be registered, a confirmation link will be sent. If you already have an account, sign in or reset your password.";

function signupRequestReceipt() {
  return NextResponse.json({ ok: true, session: false, message: NEUTRAL_SIGNUP_MESSAGE });
}

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
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Send a valid signup form." }, { status: 400 });
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
    const fullName = cleanText(body.full_name, 120);
    const next = safeAuthNext(cleanText(body.next, 300));
    if (!email || !password || !confirmation || !fullName) return NextResponse.json({ error: "Name, email, password, and password confirmation are required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) return NextResponse.json({ error: "Use at least 12 characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });
    if (password !== confirmation) return NextResponse.json({ error: "The two passwords do not match." }, { status: 400 });
    try {
      const safety = await checkPasswordSafety(password);
      if (safety.compromised) {
        return NextResponse.json({ error: "This password appears in known breach data. Choose a unique password you have not used elsewhere." }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof HashRangeUnavailable) {
        return NextResponse.json({ error: "Password safety verification is temporarily unavailable. No account was created. Please try again." }, { status: 503 });
      }
      throw error;
    }

    let signupSecurityAttestation = "";
    try {
      signupSecurityAttestation = await issueSignupSecurityAttestation(email);
    } catch {
      return NextResponse.json({ error: "Signup security verification is temporarily unavailable. No account was created. Please try again." }, { status: 503 });
    }

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
    const emailRedirect = new URL("/auth/callback", origin);
    emailRedirect.searchParams.set("next", next);
    const signupPayload = {
      email: normalizedEmail,
      password,
      data: {
        full_name: fullName,
        signup_security_attestation: signupSecurityAttestation,
      },
      // Keep the historical callback URL unchanged for ordinary signup. A
      // validated continuation is attached only when the caller needs to
      // preserve a specific in-product destination.
      email_redirect_to: `${origin}/auth/callback`,
    };
    if (next !== "/app") {
      Object.assign(signupPayload, { email_redirect_to: emailRedirect.toString() });
    }
    if (authEmailDeliveryAvailable()) {
      // Supabase Auth SMTP is not relied on for confirmation mail (see
      // lib/auth-email-delivery.ts). generate_link creates the unconfirmed user
      // through the same attestation hook, and we deliver the link ourselves.
      let actionLink: string;
      try {
        ({ actionLink } = await generateAuthLink({
          type: "signup",
          email: normalizedEmail,
          password,
          data: signupPayload.data,
          redirectTo: signupPayload.email_redirect_to,
        }));
      } catch (error) {
        if (error instanceof AuthLinkError && error.alreadyRegistered) {
          return signupRequestReceipt();
        }
        if (error instanceof AuthLinkError && (error.status === 429 || error.status >= 500)) {
          return NextResponse.json({ error: "Account creation is temporarily unavailable. No account changes were confirmed. Please try again in a moment." }, { status: error.status === 429 ? 429 : 503 });
        }
        const message = error instanceof Error ? error.message : "Could not create the account.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      try {
        await sendSignupConfirmationEmail(normalizedEmail, actionLink);
      } catch {
        return NextResponse.json({
          error: "Your account was created but the confirmation email could not be sent. Submit the form again in a minute to resend it, or email hello@foremention.com.",
        }, { status: 503 });
      }
      return signupRequestReceipt();
    }
    const data = await supabaseAuth("signup", signupPayload);
    const user = data.user && typeof data.user === "object"
      ? data.user as { identities?: unknown[] }
      : null;
    // With email confirmation enabled, Supabase deliberately returns an
    // obfuscated user with no identities when the address is already
    // registered. Treating that as a new signup incorrectly tells the person
    // to wait for an email that will never arrive.
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      return signupRequestReceipt();
    }
    await attemptWelcomeEmail(normalizedEmail, origin);
    const token = String(data.access_token || "");
    if (!token) return signupRequestReceipt();
    // Signup and sign-in remain separate journeys. Some Supabase projects
    // issue a session immediately when email confirmation is disabled. Never
    // turn that signup response into a Foremention login session.
    return signupRequestReceipt();
  } catch (error) {
    if (error instanceof SupabaseAuthError && error.retryable) {
      return NextResponse.json({ error: "Account creation is temporarily unavailable. No account changes were confirmed. Please try again in a moment." }, { status: error.status === 429 ? 429 : 503 });
    }
    const message = error instanceof Error ? error.message : "Could not create the account.";
    if (/email rate limit|rate limit/i.test(message)) return NextResponse.json({ error: "Email delivery is temporarily limited by the email provider. Please wait a few minutes before trying again." }, { status: 429 });
    if (/already registered|already exists|user already/i.test(message)) {
      return signupRequestReceipt();
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
