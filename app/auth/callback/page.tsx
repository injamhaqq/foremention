import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Authentication callback" };

export default function AuthCallbackPage() {
  return <main className="auth-page"><Link href="/"><Wordmark /></Link><section className="auth-card"><span className="eyebrow">Secure callback</span><h1>Continue account recovery.</h1><p>This callback is reserved for the configured authentication provider. In production, the provider completes the recovery exchange before a password is changed.</p><Link className="button button--ink button--wide" href="/login">Return to sign in →</Link></section></main>;
}
