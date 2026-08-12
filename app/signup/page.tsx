import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { googleAuthEnabled } from "@/lib/google-auth";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Create account", description: "Create a Foremention recommendation intelligence workspace.", path: "/signup", noIndex: true });
export default function SignupPage() { return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>Find the deciding sources.</span><span>Choose a legitimate route.</span><span>Track what happened.</span></div><Link href="/">← Back to site</Link></div><AuthForm mode="signup" googleEnabled={googleAuthEnabled()} /></main>; }
