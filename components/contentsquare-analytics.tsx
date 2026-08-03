"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "foremention:contentsquare-consent";
const SCRIPT_ID = "foremention-contentsquare";

type Consent = "accepted" | "declined" | null;

function configuredTagUrl() {
  const value = process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG_URL;
  return value?.startsWith("https://t.contentsquare.net/uxa/") && value.endsWith(".js") ? value : null;
}

export function ContentsquareAnalytics() {
  const [consent, setConsent] = useState<Consent>(null);
  const tagUrl = configuredTagUrl();

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") setConsent(stored);
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !tagUrl || document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = tagUrl;
    script.async = true;
    script.defer = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    document.head.appendChild(script);
  }, [consent, tagUrl]);

  function choose(next: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
  }

  if (consent || !tagUrl) return null;

  return <aside className="analytics-consent" aria-label="Optional experience analytics">
    <p><strong>Help improve Foremention</strong><span>Allow optional experience analytics to help us find usability problems. We do not use this for AI answers, evidence, passwords, or form content.</span></p>
    <div>
      <button type="button" className="button button--outline button--small" onClick={() => choose("declined")}>Decline</button>
      <button type="button" className="button button--ink button--small" onClick={() => choose("accepted")}>Allow analytics</button>
    </div>
  </aside>;
}
