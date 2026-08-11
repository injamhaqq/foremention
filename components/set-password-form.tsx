"use client";

import { useRef, useState, type FormEvent } from "react";

export function SetPasswordForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submissionLock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmation") || "");
    setError("");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) return setError("Use at least 12 characters with uppercase, lowercase, a number, and a symbol.");
    if (password !== confirmation) return setError("The two passwords do not match.");
    setBusy(true);
    submissionLock.current = true;
    let navigating = false;
    try {
      const response = await fetch("/api/auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) return setError(data.error || "We could not save your new password.");
      navigating = true;
      window.location.replace("/app");
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      if (!navigating) {
        submissionLock.current = false;
        setBusy(false);
      }
    }
  }

  return <form className="auth-card__form" onSubmit={submit} aria-busy={busy}>
    <label>New password<span className="password-control"><input type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" minLength={12} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span><small>Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</small></label>
    <label>Confirm new password<input type={showPassword ? "text" : "password"} name="confirmation" autoComplete="new-password" minLength={12} required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
  </form>;
}
