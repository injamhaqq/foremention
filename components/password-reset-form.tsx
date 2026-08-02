"use client";

import { useRef, useState, type FormEvent } from "react";

export function PasswordResetForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submissionLock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true;
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email") }) });
      const data = await response.json() as { message?: string; error?: string };
      setMessage(data.message || data.error || "Check your inbox for the next step.");
    } catch {
      setMessage("The reset request could not be sent. Try again shortly.");
    } finally { submissionLock.current = false; setBusy(false); }
  }
  return <form className="auth-card__form" onSubmit={submit} aria-busy={busy}><label>Work email<input type="email" name="email" autoComplete="email" required placeholder="you@company.com" /></label><button className="button button--ink button--wide" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link →"}</button>{message && <p className="auth-message" role="status">{message}</p>}</form>;
}
