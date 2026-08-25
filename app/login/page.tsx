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
  return <main className="auth-page auth-page--evidence"><div className="auth-brand"><Wordmark /><div className="auth-brand__positioning"><span className="auth-brand__kicker">Recommendation intelligence for B2B SaaS</span><strong>Return to the recommendation record.</strong><p>Buyer questions, observed answers, returned references, review states, and later comparable runs stay inside one accountable workspace.</p><ol className="auth-brand__trace" aria-label="Evidence workflow"><li><span>01</span><small>Question</small></li><li><span>02</span><small>Answer</small></li><li><span>03</span><small>Evidence</small></li><li><span>04</span><small>Review</small></li></ol><span className="auth-brand__principle">Evidence before theatre</span></div><Link href="/"><span aria-hidden="true">←</span> Back to site</Link></div><div className="auth-stack"><AuthForm mode="login" next={query.next} statusMessage={statusMessage} googleEnabled={googleAuthEnabled()} /><form className="demo-access" action="/api/auth/demo" method="post"><span>Want to inspect the product first?</span><PendingSubmitButton idle="Explore the fictional workspace →" pending="Opening demo…" /><small>No account, provider call, or customer data required.</small></form></div></main>;
}
