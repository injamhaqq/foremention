"use client";

import { useRef, useState, type FormEvent } from "react";
import { captureProductEvent } from "@/lib/product-analytics";

export function AuthForm({ mode, next = "/app", statusMessage = "" }: {
  mode: "login" | "signup";
  next?: string;
  statusMessage?: string;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeEmail, setNoticeEmail] = useState("");
  const [accountHelp, setAccountHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submissionLock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
    const formData = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setAccountHelp(false);

    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmation") || "");
    if (mode === "signup" && password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    submissionLock.current = true;
    let navigating = false;
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const data = (await response.json()) as { error?: string; message?: string; session?: boolean; email?: string; account_help?: boolean };
      if (!response.ok) {
        setAccountHelp(Boolean(data.account_help));
        setNoticeEmail(data.email || String(formData.get("email") || ""));
        setError(data.error || "We could not complete that request. Check your details and try again.");
        return;
      }
      if (data.session === false) {
        if (!isLogin) captureProductEvent("signup_completed", { confirmation_required: true });
        setAccountHelp(Boolean(data.account_help));
        setNotice(data.message || "Check your inbox to confirm your account.");
        setNoticeEmail(data.email || String(formData.get("email") || ""));
        return;
      }
      if (!isLogin) captureProductEvent("signup_completed", { confirmation_required: false });
      // Use a full navigation after the server sets the HTTP-only session
      // cookie. This guarantees that the first protected request includes the
      // new cookie instead of racing a client-router refresh.
      navigating = true;
      window.location.assign(next.startsWith("/") ? next : "/app");
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      if (!navigating) {
        submissionLock.current = false;
        setBusy(false);
      }
    }
  }

  if (notice) {
    if (accountHelp) {
      return (
        <div className="auth-card auth-card--status">
          <span className="eyebrow">Account found</span>
          <h1>Continue to your account.</h1>
          <p role="status" aria-live="polite">{notice}</p>
          {noticeEmail && <p className="auth-email-receipt">Account email <strong>{noticeEmail}</strong></p>}
          <a className="button button--ink button--wide" href="/login">Go to sign in</a>
          <a className="auth-recovery" href="/forgot-password">Reset password</a>
          <button className="text-button" type="button" onClick={() => { setNotice(""); setNoticeEmail(""); setAccountHelp(false); }}>Use a different email</button>
        </div>
      );
    }
    return (
      <div className="auth-card auth-card--status">
        <span className="eyebrow">Check your inbox</span>
        <h1>Confirm your email.</h1>
        <p role="status" aria-live="polite">{notice}</p>
        {noticeEmail && <p className="auth-email-receipt">Sent to <strong>{noticeEmail}</strong></p>}
        <ol className="auth-steps">
          <li>Open the newest email from <strong>Foremention</strong>.</li>
          <li>Select <strong>Confirm my email</strong>.</li>
          <li>The verified link opens guided workspace setup automatically.</li>
        </ol>
        <a className="button button--ink button--wide" href="/login">Already confirmed? Sign in</a>
        <button className="text-button" type="button" onClick={() => { setNotice(""); setNoticeEmail(""); setAccountHelp(false); }}>Use a different email</button>
      </div>
    );
  }

  const isLogin = mode === "login";
  return (
    <div className="auth-card">
      <div>
        <span className="eyebrow">{isLogin ? "Workspace access" : "Create your workspace"}</span>
        <h1>{isLogin ? "Sign in to Foremention." : "Create your workspace."}</h1>
        <p>
          {isLogin
            ? "Your buyer questions, answer runs, Source Map, evidence, and analytics stay in one secure workspace."
            : "Start with your category, then connect buyer questions, answer evidence, sources, competitors, and change over time."}
        </p>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        {!isLogin && <label>Full name<input name="full_name" required autoComplete="name" placeholder="Your name" /></label>}
        <label>Email<input type="email" name="email" required autoComplete="email" placeholder="you@example.com" /></label>
        <label>
          {isLogin ? "Password" : "Create password"}
          <span className="password-control">
            <input type={showPassword ? "text" : "password"} name="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>{showPassword ? "Hide" : "Show"}</button>
          </span>
          <small>Use at least 8 characters.</small>
        </label>
        {!isLogin && <label>Confirm password<input type={showPassword ? "text" : "password"} name="confirmation" required minLength={8} autoComplete="new-password" /></label>}
        {statusMessage && !error && <p className="auth-session-notice" role="status">{statusMessage}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {error && accountHelp && <p className="auth-inline-help">Go to <a href="/login">sign in</a>, or <a href="/forgot-password">reset your password</a>.</p>}
        <button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Working..." : isLogin ? "Sign in" : "Create workspace"}</button>
      </form>
      {isLogin && <a className="auth-recovery" href="/forgot-password">Forgot password?</a>}
      <p className="auth-switch">{isLogin ? <>No account? <a href="/signup">Create a workspace</a></> : <>Already have an account? <a href="/login">Sign in</a></>}</p>
    </div>
  );
}
