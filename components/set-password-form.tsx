"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(formData: FormData) {
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmation") || "");
    setError("");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) return setError(data.error || "We could not save your new password.");
      router.replace("/app");
      router.refresh();
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="auth-card__form" action={submit}>
    <label>New password<span className="password-control"><input type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" minLength={8} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span><small>Use at least 8 characters.</small></label>
    <label>Confirm new password<input type={showPassword ? "text" : "password"} name="confirmation" autoComplete="new-password" minLength={8} required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button--ink button--wide" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
  </form>;
}
