"use client";

import { useState, type FormEvent } from "react";

export function AuthForm({ mode, next = "/app" }: { mode: "login" | "signup"; next?: string }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setNotice("");

    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmation") || "");
    if (mode === "signup" && password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
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
      // Use a full navigation after the server sets the HTTP-only session
      // cookie. This guarantees that the first protected request includes the
      // new cookie instead of racing a client-router refresh.
      window.location.assign(next.startsWith("/") ? next : "/app");
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (notice) {
    return (
      <div className="auth-card auth-card--status">
        <span className="eyebrow">Check your inbox</span>
        <h1>Confirm your email.</h1>
        <p role="status" aria-live="polite">{notice}</p>
        <ol className="auth-steps">
          <li>Open the newest confirmation email sent to the address you entered.</li>
          <li>Select <strong>Confirm my email</strong>.</li>
          <li>The verified link opens your workspace automatically.</li>
        </ol>
        <a className="button button--ink button--wide" href="/login">Go to sign in</a>
        <button className="text-button" type="button" onClick={() => setNotice("")}>Use a different email</button>
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
      <form onSubmit={submit}>
        {!isLogin && <label>Full name<input name="full_name" required autoComplete="name" placeholder="Your name" /></label>}
        <label>Work email<input type="email" name="email" required autoComplete="email" placeholder="you@company.com" /></label>
        <label>
          {isLogin ? "Password" : "Create password"}
          <span className="password-control">
            <input type={showPassword ? "text" : "password"} name="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>{showPassword ? "Hide" : "Show"}</button>
          </span>
          <small>Use at least 8 characters.</small>
        </label>
        {!isLogin && <label>Confirm password<input type={showPassword ? "text" : "password"} name="confirmation" required minLength={8} autoComplete="new-password" /></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Working..." : isLogin ? "Sign in" : "Create workspace"}</button>
      </form>
      {isLogin && <a className="auth-recovery" href="/forgot-password">Forgot password?</a>}
      <p className="auth-switch">{isLogin ? <>No account? <a href="/signup">Create a workspace</a></> : <>Already have an account? <a href="/login">Sign in</a></>}</p>
    </div>
  );
}
