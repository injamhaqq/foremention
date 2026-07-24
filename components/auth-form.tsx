"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, next = "/app" }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const data = (await response.json()) as { error?: string; message?: string; session?: boolean };
      if (!response.ok) {
        setError(data.error || "We could not complete that request. Check your details and try again.");
        return;
      }
      if (data.session === false) {
        setNotice(data.message || "Check your inbox to confirm your account.");
        return;
      }
      router.push(next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (notice) {
    return <div className="auth-card auth-card--status"><span className="eyebrow">Check your inbox</span><h1>Confirm your email.</h1><p role="status" aria-live="polite">{notice}</p><ol className="auth-steps"><li>Open the confirmation email we sent to the address you entered.</li><li>Select <strong>Confirm your email</strong>.</li><li>Return here and your workspace will open automatically.</li></ol><Link className="button button--ink button--wide" href="/login">Go to sign in</Link><button className="text-button" type="button" onClick={() => setNotice("")}>Use a different email</button></div>;
  }

  const isLogin = mode === "login";
  return <div className="auth-card"><div><span className="eyebrow">{isLogin ? "Workspace access" : "Create your workspace"}</span><h1>{isLogin ? "Sign in to Foremention." : "Create your workspace."}</h1><p>{isLogin ? "Your buyer questions, answer runs, Source Map, evidence, and analytics stay in one secure workspace." : "Start with your category, then connect buyer questions, answer evidence, sources, competitors, and change over time."}</p></div><form action={submit}>{!isLogin && <label>Full name<input name="full_name" required autoComplete="name" placeholder="Your name" /></label>}<label>Work email<input type="email" name="email" required autoComplete="email" placeholder="you@company.com" /></label><label>Password<input type="password" name="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} /><small>Use at least 8 characters.</small></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Working…" : isLogin ? "Sign in" : "Create workspace"}</button></form>{isLogin && <Link className="auth-recovery" href="/forgot-password">Forgot password?</Link>}<p className="auth-switch">{isLogin ? <>No account? <Link href="/signup">Create a workspace</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p></div>;
}
