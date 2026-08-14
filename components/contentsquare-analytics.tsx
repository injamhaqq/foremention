"use client";

import { useEffect, useSyncExternalStore } from "react";

const CONSENT_KEY = "foremention:experience-analytics-consent";
const LEGACY_CONSENT_KEY = "foremention:contentsquare-consent";
const CONSENT_EVENT = "foremention:experience-analytics-consent-changed";
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

function readStoredConsent(): Consent {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(CONSENT_KEY)
    ?? window.localStorage.getItem(LEGACY_CONSENT_KEY);
  return stored === "accepted" || stored === "declined" ? stored : null;
}

function subscribeToConsent(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CONSENT_KEY || event.key === LEGACY_CONSENT_KEY) callback();
  };
  const handleCustom = () => callback();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CONSENT_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CONSENT_EVENT, handleCustom);
  };
}

function writeStoredConsent(next: Exclude<Consent, null>) {
  window.localStorage.setItem(CONSENT_KEY, next);
  window.localStorage.removeItem(LEGACY_CONSENT_KEY);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function useExperienceAnalyticsConsent() {
  return useSyncExternalStore(subscribeToConsent, readStoredConsent, () => null);
}

export function ContentsquareAnalytics() {
  const consent = useExperienceAnalyticsConsent();
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

  // Optional experience analytics is privacy-off by default. This loader never
  // renders a blocking or floating consent surface; users can opt in from the
  // normal footer preference control instead.
  return null;
}

export function ExperienceAnalyticsPreferences() {
  const consent = useExperienceAnalyticsConsent();
  const enabled = consent === "accepted";

  function choose(next: Exclude<Consent, null>) {
    const previous = readStoredConsent();
    writeStoredConsent(next);
    // Once a third-party script has executed, removing its script tag cannot
    // guarantee the already-loaded runtime has stopped. Reload after revoking
    // an existing opt-in so the new privacy-off state is applied cleanly.
    if (previous === "accepted" && next === "declined") window.location.reload();
  }

  return <details className="footer-analytics-preferences">
    <summary>Analytics preferences <small>{enabled ? "On" : "Off"}</small></summary>
    <div className="footer-analytics-preferences__panel">
      <p>Optional Microsoft Clarity and Contentsquare analytics stay off unless you allow them. They are not used for AI answers, evidence, passwords, or form content.</p>
      <div className="footer-analytics-preferences__actions">
        <button type="button" className="button button--outline button--small" aria-pressed={!enabled} onClick={() => choose("declined")}>Keep off</button>
        <button type="button" className="button button--small" aria-pressed={enabled} onClick={() => choose("accepted")}>Allow analytics</button>
      </div>
    </div>
  </details>;
}
