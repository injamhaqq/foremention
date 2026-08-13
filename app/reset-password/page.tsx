import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { SetPasswordForm } from "@/components/set-password-form";
import { pageMetadata } from "@/lib/seo";
import { RECOVERY_COOKIE, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/session-cookies";

export const metadata = pageMetadata({ title: "Choose a new password", description: "Choose and confirm a new Foremention account password.", path: "/reset-password", noIndex: true });

export default async function ResetPasswordPage() {
  const store = await cookies();
  const recovery = store.get(RECOVERY_COOKIE)?.value === "1";
  const session = store.get(SESSION_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;

  if (!recovery) redirect("/forgot-password");
  if (!session && refresh) redirect(`/api/auth/refresh?next=${encodeURIComponent("/reset-password")}`);
  if (!session) redirect("/forgot-password");

  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>One secure link.</span><span>One new password.</span><span>One restored workspace.</span></div><Link href="/">← Back to site</Link></div><section className="auth-card"><span className="eyebrow">Account recovery</span><h1>Choose a new password.</h1><p>Your recovery link has verified this browser. Set a new password, then we will open your workspace.</p><SetPasswordForm /></section></main>;
}
