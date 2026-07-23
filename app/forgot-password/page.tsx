import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <main className="auth-page"><Link href="/"><Wordmark /></Link><section className="auth-card"><span className="eyebrow">Account recovery</span><h1>Reset your password.</h1><p>Enter the email connected to your foremention workspace. If Supabase is configured, we’ll send a secure recovery link.</p><PasswordResetForm /><Link className="text-link" href="/login">Return to sign in</Link></section></main>;
}
