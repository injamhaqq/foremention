import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { googleAuthEnabled, safeAuthNext } from "@/lib/google-auth";
import { pageMetadata } from "@/lib/seo";
import { safePublicScoreId, scoreOnboardingNext } from "@/lib/score-handoff";

export const metadata: Metadata = pageMetadata({ title: "Create account", description: "Create a Foremention recommendation intelligence workspace.", path: "/signup", noIndex: true });

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ score_id?: string; next?: string }> }) {
  const query = await searchParams;
  const scoreId = safePublicScoreId(query.score_id);
  const next = scoreId ? scoreOnboardingNext(scoreId) : safeAuthNext(query.next);
  const statusMessage = scoreId ? "Your public check will carry your brand, category, and buyer questions into guided setup after account verification. The public result itself will not become verified workspace evidence." : "";
  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>Find the deciding sources.</span><span>Choose a legitimate route.</span><span>Track what happened.</span></div><Link href="/">← Back to site</Link></div><AuthForm mode="signup" next={next} statusMessage={statusMessage} googleEnabled={googleAuthEnabled()} /></main>;
}
