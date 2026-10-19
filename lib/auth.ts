import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseConfigured } from "@/lib/supabase-rest";
import { DEMO_COOKIE, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/session-cookies";
import { REQUEST_PATH_HEADER, returnPathFromRequestPath } from "@/lib/auth-return-path";

export { DEMO_COOKIE, REFRESH_COOKIE, SESSION_COOKIE };

export type Viewer = {
  id: string;
  email: string;
  name: string;
  mode: "demo" | "supabase";
  accessToken?: string;
  /** True only when Supabase Auth reports a confirmed email for this user. */
  emailVerified?: boolean;
};

export const getViewer = cache(async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  if (store.get(DEMO_COOKIE)?.value === "1") {
    return { id: "00000000-0000-4000-8000-000000000001", email: "demo@foremention.example", name: "Maya Chen", mode: "demo" };
  }
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || !supabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) return null;
    const user = (await response.json()) as { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: { full_name?: string; name?: string } };
    const email = user.email || "signed-in user";
    return { id: user.id, email, name: user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0], mode: "supabase", accessToken: token, emailVerified: Boolean(user.email && user.email_confirmed_at) };
  } catch {
    return null;
  }
});

/**
 * The exact in-app URL the visitor asked for, so sign-in returns there (the
 * protected layout runs before the page and cannot see its own URL). Falls
 * back to the caller's static `returnTo`. Only same-origin /app paths survive.
 */
async function requestedReturnPath(returnTo: string) {
  try {
    const requested = (await headers()).get(REQUEST_PATH_HEADER);
    return returnPathFromRequestPath(requested, returnTo);
  } catch {
    return returnPathFromRequestPath(null, returnTo);
  }
}

export async function requireViewer(fallbackReturnTo = "/app") {
  const viewer = await getViewer();
  if (!viewer) {
    const returnTo = await requestedReturnPath(fallbackReturnTo);
    const store = await cookies();
    if (store.get(REFRESH_COOKIE)?.value) {
      redirect(`/api/auth/refresh?next=${encodeURIComponent(returnTo)}`);
    }
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return viewer;
}

/**
 * Account shown in the header of public request-time pages (pricing, payment)
 * when a session exists. Never throws: a public page must still render.
 */
export async function getSiteHeaderAccount(): Promise<{ name: string; email: string; demo?: boolean } | null> {
  try {
    const viewer = await getViewer();
    if (!viewer) return null;
    return { name: viewer.name, email: viewer.email, ...(viewer.mode === "demo" ? { demo: true } : {}) };
  } catch {
    return null;
  }
}
