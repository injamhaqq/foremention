"use client";

import { useState } from "react";

export function PasswordResetForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email") }) });
      const data = await response.json() as { message?: string; error?: string };
      setMessage(data.message || data.error || "Check your inbox for the next step.");
    } catch {
      setMessage("The reset request could not be sent. Try again shortly.");
    } finally { setBusy(false); }
  }
  return <form className="auth-card__form" action={submit}><label>Work email<input type="email" name="email" autoComplete="email" required placeholder="you@company.com" /></label><button className="button button--ink button--wide" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link →"}</button>{message && <p className="auth-message" role="status">{message}</p>}</form>;
}
