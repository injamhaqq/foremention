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
  const statusMessage = scoreId ? "Your public check results will carry into your workspace after you verify your account." : "";
  return <main className="auth-page auth-page--evidence"><div className="auth-brand"><Wordmark /><div className="auth-brand__positioning"><span className="auth-brand__kicker">Recommendation intelligence for B2B SaaS</span><strong>Create the record before the claim.</strong><p>Establish the company, category, comparison set, and buyer questions first. Collection begins only from the workspace you approve.</p><ol className="auth-brand__trace" aria-label="Workspace setup record"><li><span>01</span><small>Company</small></li><li><span>02</span><small>Category</small></li><li><span>03</span><small>Questions</small></li><li><span>04</span><small>Evidence</small></li></ol><span className="auth-brand__principle">Evidence before theatre</span></div><Link href="/"><span aria-hidden="true">←</span> Back to site</Link></div><div className="auth-stack"><AuthForm mode="signup" next={next} statusMessage={statusMessage} googleEnabled={googleAuthEnabled()} /><p className="auth-commercial-truth"><strong>Design-partner / private-beta workspace.</strong> Creating a workspace does not charge a card. Measurement capacity is activated only after your workspace scope is confirmed.</p></div></main>;
}
