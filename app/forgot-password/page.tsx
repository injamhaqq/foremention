import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { Wordmark } from "@/components/brand";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Reset password", description: "Request a secure Foremention password recovery link.", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage() {
  return <main className="auth-page auth-page--evidence"><div className="auth-brand"><Wordmark /><div className="auth-brand__positioning"><span className="auth-brand__kicker">Recommendation intelligence for B2B SaaS</span><strong>Recover access without changing the record.</strong><p>Password recovery restores workspace access only. It does not alter your buyer questions, evidence records, review states, or comparison history.</p><span className="auth-brand__principle">Evidence before theatre</span></div><Link href="/"><span aria-hidden="true">←</span> Back to site</Link></div><section className="auth-card" data-evidence-record="auth"><span className="auth-record-index">AUTH / RECOVERY</span><span className="eyebrow">Account recovery</span><h1>Reset your password.</h1><p>Enter the email connected to your Foremention workspace. We will send a secure recovery link.</p><PasswordResetForm /><a className="text-link" href="/login">Return to sign in</a></section></main>;
}
