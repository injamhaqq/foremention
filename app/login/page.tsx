import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { googleAuthEnabled } from "@/lib/google-auth";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Sign in", description: "Sign in to your Foremention recommendation intelligence workspace.", path: "/login", noIndex: true });
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const query = await searchParams;
  const statusMessage = query.reason === "session_expired"
    ? "Your secure session expired. Sign in again to continue where you left off."
    : query.reason === "auth_temporarily_unavailable"
      ? "The sign-in service was temporarily unavailable. Your saved session was preserved; try opening your workspace again in a moment."
      : query.reason === "google_unavailable"
        ? "Google sign-in is not active for this environment. Use email and password instead."
        : query.reason === "signed_out"
          ? "You signed out of this device. Other signed-in devices were left unchanged."
          : query.reason === "signed_out_cleanup_unconfirmed"
            ? "You signed out of this browser, but the authentication service did not confirm remote cleanup of that session. Sign in again and use Sign out all devices if you are responding to a lost or shared device."
            : query.reason === "all_sessions_revoked"
              ? "All refresh sessions for your account were revoked. Already-issued access tokens on another device can remain valid until their encoded expiry."
              : "";
  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>One buyer question.</span><span>One answer.</span><span>One outside page.</span><span>One accountable trail.</span></div><Link href="/">← Back to site</Link></div><div className="auth-stack"><AuthForm mode="login" next={query.next} statusMessage={statusMessage} googleEnabled={googleAuthEnabled()} /><form className="demo-access" action="/api/auth/demo" method="post"><span>Want to inspect the product first?</span><PendingSubmitButton idle="Explore the fictional workspace →" pending="Opening demo…" /><small>No account, provider call, or customer data required.</small></form></div></main>;
}
