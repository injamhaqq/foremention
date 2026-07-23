import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const query = await searchParams;
  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>One buyer question.</span><span>One answer.</span><span>One outside page.</span><span>One accountable trail.</span></div><Link href="/">← Back to site</Link></div><AuthForm mode="login" next={query.next} /></main>;
}
