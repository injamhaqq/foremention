"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand";

export function AuthCallback() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying your email and opening your workspace…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("access_token");
    const isRecovery = hash.get("type") === "recovery" || searchParams.get("type") === "recovery";
    const next = isRecovery ? "/reset-password" : (searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/app");
    const authError = hash.get("error_description") || hash.get("error") || searchParams.get("error_description");
    if (!token) {
      const timeout = window.setTimeout(() => {
        setMessage(authError ? decodeURIComponent(authError.replace(/\+/g, " ")) : "This confirmation link is incomplete or has expired. Please sign in or request another email.");
        setFailed(true);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    void fetch("/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ access_token: token, expires_in: Number(hash.get("expires_in") || 3600) }),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || "The verification link could not be completed.");
      setMessage(isRecovery ? "Recovery link verified. Choose your new password…" : "Email verified. Opening your workspace…");
      // The callback has just written an HTTP-only cookie. A document
      // navigation makes the cookie/session handoff deterministic.
      window.location.replace(next);
    }).catch((error: Error) => {
      setMessage(error.message);
      setFailed(true);
    });
  }, [searchParams]);

  return <main className="auth-page"><div className="auth-brand"><Wordmark /><div><span>One clear step.</span><span>One verified account.</span><span>One secure workspace.</span></div><Link href="/">← Back to site</Link></div><section className="auth-card auth-card--status"><span className="eyebrow">Account verification</span><h1>{failed ? "Let’s get you back in." : "Confirming your workspace."}</h1><p role="status" aria-live="polite">{message}</p>{failed && <div className="auth-status-actions"><Link className="button button--ink button--wide" href="/login">Go to sign in</Link><Link className="text-button" href="/forgot-password">Request a new link</Link></div>}</section></main>;
}
