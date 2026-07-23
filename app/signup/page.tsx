import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Create account" };
export default function SignupPage() { return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>Find the deciding sources.</span><span>Choose a legitimate route.</span><span>Track what happened.</span></div><Link href="/">← Back to site</Link></div><AuthForm mode="signup" /></main>; }
