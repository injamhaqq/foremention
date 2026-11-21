// One browser-side analytics consent state for every cookie/storage-based
// analytics integration: PostHog product analytics, Microsoft Clarity and
// Contentsquare. Nothing that sets analytics cookies or storage may initialise
// until this returns "accepted". The storage key is unchanged from the original
// experience-analytics control, so earlier opt-ins and opt-outs carry over.

export const ANALYTICS_CONSENT_KEY = "foremention:experience-analytics-consent";
export const LEGACY_ANALYTICS_CONSENT_KEY = "foremention:contentsquare-consent";
export const ANALYTICS_CONSENT_EVENT = "foremention:experience-analytics-consent-changed";

export type AnalyticsConsent = "accepted" | "declined" | null;

type ConsentStorage = Pick<Storage, "getItem">;

export function parseAnalyticsConsent(storage: ConsentStorage | null | undefined): AnalyticsConsent {
  if (!storage) return null;
  let stored: string | null = null;
  try {
    stored = storage.getItem(ANALYTICS_CONSENT_KEY) ?? storage.getItem(LEGACY_ANALYTICS_CONSENT_KEY);
  } catch {
    // Storage blocked (private mode, sandboxed frame): treat as no consent.
    return null;
  }
  return stored === "accepted" || stored === "declined" ? stored : null;
}

export function readStoredAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  try {
    return parseAnalyticsConsent(window.localStorage);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readStoredAnalyticsConsent() === "accepted";
}

export function writeStoredAnalyticsConsent(next: Exclude<AnalyticsConsent, null>) {
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, next);
  window.localStorage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function subscribeToAnalyticsConsent(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === ANALYTICS_CONSENT_KEY || event.key === LEGACY_ANALYTICS_CONSENT_KEY) callback();
  };
  const handleCustom = () => callback();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ANALYTICS_CONSENT_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleCustom);
  };
}
