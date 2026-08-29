import { supabaseAuth } from "@/lib/supabase-rest";

export function configuredSsoDomains() {
  return Array.from(new Set((process.env.FOREMENTION_SSO_DOMAINS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

export function enterpriseSsoConfigured() {
  return configuredSsoDomains().length > 0 && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function emailDomain(email: string) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1 || at === normalized.length - 1) return null;
  const domain = normalized.slice(at + 1);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : null;
}

export async function startEnterpriseSso(email: string, redirectTo: string) {
  if (!enterpriseSsoConfigured()) throw new Error("SSO is not configured.");
  const domain = emailDomain(email);
  if (!domain) throw new Error("Enter a valid work email for SSO.");
  if (!configuredSsoDomains().includes(domain)) throw new Error("SSO is not configured for this email domain.");
  let redirect: URL;
  try { redirect = new URL(redirectTo); } catch { throw new Error("SSO return URL is invalid."); }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      if (redirect.origin !== new URL(siteUrl).origin) throw new Error("SSO return URL must stay on Foremention.");
    } catch (error) {
      if (error instanceof Error && /must stay/.test(error.message)) throw error;
      throw new Error("SSO return URL is invalid.");
    }
  }
  const data = await supabaseAuth("sso", { domain, redirect_to: redirect.toString() });
  const url = typeof data.url === "string" ? data.url : typeof data.action_link === "string" ? data.action_link : null;
  if (!url) throw new Error("The SSO provider did not return a sign-in URL.");
  return { url, domain };
}
