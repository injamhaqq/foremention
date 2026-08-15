"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  // normal footer settings control instead.
  return null;
}

export function ExperienceAnalyticsPreferences() {
  const consent = useExperienceAnalyticsConsent();
  const enabled = consent === "accepted";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);

    focusables()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  function closeDialog() {
    setOpen(false);
  }

  function choose(next: Exclude<Consent, null>) {
    const previous = readStoredConsent();
    writeStoredConsent(next);
    // Once a third-party script has executed, removing its script tag cannot
    // guarantee the already-loaded runtime has stopped. Reload after revoking
    // an existing opt-in so the new privacy-off state is applied cleanly.
    if (previous === "accepted" && next === "declined") {
      window.location.reload();
      return;
    }
    closeDialog();
  }

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="footer-analytics-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      Analytics settings <small>{enabled ? "On" : "Off"}</small>
    </button>
    {open ? <div
      className="analytics-settings-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
    >
      <div
        ref={dialogRef}
        className="analytics-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-settings-title"
        aria-describedby="analytics-settings-description"
      >
        <div className="analytics-settings-dialog__head">
          <span className="eyebrow">Optional experience analytics</span>
          <button type="button" className="analytics-settings-dialog__close" aria-label="Close analytics settings" onClick={closeDialog}>Close</button>
        </div>
        <h2 id="analytics-settings-title">Analytics settings</h2>
        <p id="analytics-settings-description">Microsoft Clarity and Contentsquare stay off unless you allow them. They are not used for AI answers, evidence, passwords, or form content.</p>
        <p className="analytics-settings-dialog__note">This preference controls optional experience analytics only. Foremention&apos;s privacy-limited product telemetry is described separately in the Privacy notice.</p>
        <div className="analytics-settings-actions">
          <button type="button" className="button button--outline" aria-pressed={!enabled} onClick={() => choose("declined")}>Keep off</button>
          <button type="button" className="button" aria-pressed={enabled} onClick={() => choose("accepted")}>Allow analytics</button>
        </div>
      </div>
    </div> : null}
  </>;
}
