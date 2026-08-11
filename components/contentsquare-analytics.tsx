"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const CONSENT_KEY = "foremention:experience-analytics-consent";
const SCRIPT_ID = "foremention-contentsquare";
const CLARITY_SCRIPT_ID = "foremention-clarity";

type Consent = "accepted" | "declined" | null;

function configuredTagUrl() {
  const value = process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG_URL?.trim();
  if (!value) return null;
  const candidate = value.startsWith("https://")
    ? value
    : value.match(/src=["'](https:\/\/t\.contentsquare\.net\/uxa\/[a-z0-9]+\.js)["']/i)?.[1];
  return candidate?.match(/^https:\/\/t\.contentsquare\.net\/uxa\/[a-z0-9]+\.js$/i) ? candidate : null;
}

function configuredClarityProjectId() {
  const value = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  return value?.match(/^[a-z0-9]{6,32}$/i) ? value : null;
}

const subscribeToNothing = () => () => {};

function readStoredConsent(): Consent {
  const stored = window.localStorage.getItem(CONSENT_KEY)
    ?? window.localStorage.getItem("foremention:contentsquare-consent");
  return stored === "accepted" || stored === "declined" ? stored : null;
}

export function ContentsquareAnalytics() {
  const storedConsent = useSyncExternalStore(subscribeToNothing, readStoredConsent, () => null);
  const [chosenConsent, setChosenConsent] = useState<Consent>(null);
  const consent = chosenConsent ?? storedConsent;
  const tagUrl = configuredTagUrl();
  const clarityProjectId = configuredClarityProjectId();

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

  useEffect(() => {
    if (consent !== "accepted" || !clarityProjectId || document.getElementById(CLARITY_SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = CLARITY_SCRIPT_ID;
    script.src = `https://www.clarity.ms/tag/${clarityProjectId}`;
    script.async = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    document.head.appendChild(script);
  }, [clarityProjectId, consent]);

  function choose(next: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, next);
    setChosenConsent(next);
  }

  if (consent || (!tagUrl && !clarityProjectId)) return null;

  return <aside className="analytics-consent" aria-label="Optional experience analytics">
    <p><strong>Help improve Foremention</strong><span>Allow optional experience analytics from Microsoft Clarity and Contentsquare to help us find usability problems. We do not use this for AI answers, evidence, passwords, or form content.</span></p>
    <div>
      <button type="button" className="button button--outline button--small" onClick={() => choose("declined")}>Decline</button>
      <button type="button" className="button button--ink button--small" onClick={() => choose("accepted")}>Allow analytics</button>
    </div>
  </aside>;
}
