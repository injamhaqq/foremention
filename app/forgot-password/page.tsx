import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>One secure link.</span><span>One new password.</span><span>One restored workspace.</span></div><Link href="/">← Back to site</Link></div><section className="auth-card"><span className="eyebrow">Account recovery</span><h1>Reset your password.</h1><p>Enter the email connected to your Foremention workspace. We will send a secure recovery link.</p><PasswordResetForm /><a className="text-link" href="/login">Return to sign in</a></section></main>;
}
