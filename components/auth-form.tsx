"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, next = "/app" }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter(); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  async function submit(formData: FormData) { setBusy(true); setError(""); try { const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData.entries())) }); const data = (await response.json()) as { error?: string; message?: string; session?: boolean }; if (!response.ok) { setError(data.error || "We could not complete that request. Check your details and try again."); setBusy(false); return; } if (data.session === false) { setError(data.message || "Check your email to confirm your account."); setBusy(false); return; } router.push(next.startsWith("/") ? next : "/app"); router.refresh(); } catch { setError("The connection failed. Please try again."); setBusy(false); } }
  function openDemo() {
    setBusy(true);
    setError("");
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `foremention-demo=1; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
    window.location.assign("/app");
  }
  return <div className="auth-card"><div><span className="eyebrow">{mode === "login" ? "Workspace access" : "Start free"}</span><h1>{mode === "login" ? "Sign in to Foremention." : "Create your Foremention account."}</h1><p>{mode === "login" ? "Your buyer questions, answer runs, Source Map, evidence, and analytics live in one workspace." : "Start with a small question set. No credit card is required for Explorer."}</p></div><form action={submit}>{mode === "signup" && <label>Full name<input name="full_name" required autoComplete="name" /></label>}<label>Work email<input type="email" name="email" required autoComplete="email" /></label><label>Password<input type="password" name="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /><small>Use at least 8 characters.</small></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Working..." : mode === "login" ? "Sign in" : "Create free account"}</button></form><div className="auth-separator"><span>or see the product first</span></div><button className="button button--outline button--wide" onClick={openDemo} type="button" disabled={busy}>Open seeded demo</button><p className="auth-switch">{mode === "login" ? <>No account? <Link href="/signup">Create one</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p></div>;
}
