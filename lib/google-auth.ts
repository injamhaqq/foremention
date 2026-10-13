const AUTH_NEXT_BASE = new URL("https://foremention.invalid");

export function googleAuthEnabled() {
  return process.env.FOREMENTION_GOOGLE_AUTH_ENABLED === "1";
}

// Control characters (including TAB/CR/LF, which the WHATWG URL parser
// silently strips) and backslashes (treated as "/" for http(s)) are never part
// of a legitimate in-app return path. Reject before parsing.
const UNSAFE_NEXT_CHARACTERS = /[\u0000-\u001f\u007f\\]/;

function isSameOriginPath(path: string) {
  // A normalized pathname may itself be scheme-relative ("//host"), e.g. after
  // dot-segment removal of "/.//host". It must stay same-origin when it is
  // later resolved against the real request URL or used by window.location.
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  try {
    return new URL(path, AUTH_NEXT_BASE).origin === AUTH_NEXT_BASE.origin;
  } catch {
    return false;
  }
}

export function safeAuthNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || UNSAFE_NEXT_CHARACTERS.test(value)) return "/app";

  try {
    const parsed = new URL(value, AUTH_NEXT_BASE);
    if (parsed.origin !== AUTH_NEXT_BASE.origin) return "/app";
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    // Truncating could cut a path into a different target; refuse instead.
    if (normalized.length > 300 || !isSameOriginPath(normalized)) return "/app";
    return normalized;
  } catch {
    return "/app";
  }
}

/**
 * Absolute same-site return URL for flows that must hand a full URL to an
 * identity provider (enterprise SSO). Always derived from safeAuthNext and
 * re-checked so the result can never leave the trusted site origin.
 */
export function safeAbsoluteAuthNext(value: string | null | undefined, siteOrigin: string) {
  const site = new URL(siteOrigin);
  const resolved = new URL(safeAuthNext(value), site.origin);
  return resolved.origin === site.origin ? resolved.toString() : new URL("/app", site.origin).toString();
}
