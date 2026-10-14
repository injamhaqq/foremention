/**
 * Authentication email delivery that does not depend on Supabase Auth SMTP.
 *
 * Production incident (2026-10-14): Supabase Auth's custom SMTP (Zoho) failed
 * every confirmation send with `500 Error sending confirmation email`, so no
 * new account could be created since mid-August and password recovery mail
 * never left. GoTrue rolls the signup back when its own send fails.
 *
 * This module asks GoTrue's admin `generate_link` endpoint (service role) for
 * the one-time action link instead. generate_link creates/updates the user
 * exactly like /signup (the before-user-created attestation hook still runs)
 * but never sends mail. Foremention then delivers the link through the
 * application email provider (Resend, verified sending domain). The link is
 * the same GoTrue `{{ .ConfirmationURL }}` the custom templates used: it
 * verifies on Supabase and redirects to /auth/callback with the session in the
 * URL fragment. Recovery must use this form (not a token_hash POST) because
 * only the redirect flow stamps the `recovery` AMR that /reset-password needs.
 *
 * Server-only. The service-role key never leaves the Worker.
 */
import { getApplicationEmailStatus, sendProductAlertEmail } from "@/lib/application-email";

export type AuthLinkType = "signup" | "recovery";

export class AuthLinkError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AuthLinkError";
    this.status = status;
    this.code = code;
  }
  get alreadyRegistered() {
    return this.status === 422 && /email_exists|user_already_exists/.test(this.code)
      || /already (been )?registered|already exists/i.test(this.message);
  }
  get userMissing() {
    return this.status === 404 || /user_not_found/.test(this.code);
  }
}

export function authEmailDeliveryAvailable() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.SUPABASE_SERVICE_ROLE_KEY
    && getApplicationEmailStatus().available,
  );
}

type GenerateLinkInput = {
  type: AuthLinkType;
  email: string;
  password?: string;
  data?: Record<string, unknown>;
  redirectTo: string;
};

export async function generateAuthLink(input: GenerateLinkInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new AuthLinkError(503, "not_configured", "Authentication email is not configured.");
  const body: Record<string, unknown> = { type: input.type, email: input.email, redirect_to: input.redirectTo };
  if (input.type === "signup") {
    body.password = input.password;
    if (input.data) body.data = input.data;
  }
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
  if (!response.ok) {
    const code = String(payload.error_code || payload.code || "unknown");
    const message = String(payload.msg || payload.message || payload.error_description || "Authentication link could not be created.");
    throw new AuthLinkError(response.status, code, message);
  }
  const properties = (payload.properties && typeof payload.properties === "object" ? payload.properties : payload) as Record<string, unknown>;
  const actionLink = String(properties.action_link || "");
  if (!isSupabaseVerifyLink(actionLink, url)) {
    throw new AuthLinkError(502, "no_link", "Authentication link could not be created.");
  }
  return { actionLink, userId: String(payload.id || "") };
}

export function isSupabaseVerifyLink(link: string, supabaseUrl: string) {
  try {
    const parsed = new URL(link);
    const base = new URL(supabaseUrl);
    return parsed.protocol === "https:" && parsed.host === base.host && parsed.pathname === "/auth/v1/verify" && Boolean(parsed.searchParams.get("token"));
  } catch {
    return false;
  }
}

export async function sendSignupConfirmationEmail(to: string, link: string) {
  return sendProductAlertEmail({
    to,
    subject: "Confirm your Foremention workspace",
    text: [
      "Welcome to Foremention.",
      "",
      "Confirm your email address to open your workspace:",
      link,
      "",
      "This link works once and expires in 24 hours. If you did not create a Foremention account, you can ignore this email and no account will be activated.",
      "",
      "Foremention — recommendation intelligence for B2B software",
      "hello@foremention.com",
    ].join("\n"),
  });
}

export async function sendRecoveryEmail(to: string, link: string) {
  return sendProductAlertEmail({
    to,
    subject: "Reset your Foremention password",
    text: [
      "Someone asked to reset the password for this Foremention account.",
      "",
      "Choose a new password here:",
      link,
      "",
      "This link works once and expires soon. If you did not ask for this, ignore this email; your password stays unchanged.",
      "",
      "Foremention",
      "hello@foremention.com",
    ].join("\n"),
  });
}
