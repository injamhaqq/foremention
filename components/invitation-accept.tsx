"use client";

import { useState } from "react";

export function InvitationAccept({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { error?: string; next?: string };
      if (!response.ok) throw new Error(result.error || "The invitation could not be accepted.");
      window.location.assign(result.next || "/app");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be accepted.");
      setBusy(false);
    }
  }

  return <div className="invitation-card">
    <span className="eyebrow">Secure workspace invitation</span>
    <h1>Join Foremention.</h1>
    <p>Access is granted only when the email on this invitation matches your confirmed Foremention account.</p>
    <button className="button button--ink button--wide" type="button" onClick={() => void accept()} disabled={busy}>{busy ? "Confirming…" : "Accept invitation"}</button>
    {message && <p className="form-error" role="alert">{message}</p>}
  </div>;
}
