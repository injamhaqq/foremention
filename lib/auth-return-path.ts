// Fix track "ux" (2026-10-19): deep links must survive sign-in.
//
// The protected /app layout calls requireViewer() before any page runs, and a
// layout cannot see the requested URL. It therefore always sent signed-out
// visitors to /login?next=/app, so a shared Record, notification or source
// link landed on the Overview after sign-in. The Worker now forwards the
// requested in-app path in a request header that it always overwrites (a
// client-supplied value never reaches the app), and requireViewer() turns it
// into a `next` value.
//
// Open-redirect protection: only same-origin, relative /app paths are ever
// returned. Everything is re-validated by safeAuthNext (the same helper every
// auth return sink already uses), and anything else falls back.
import { safeAuthNext } from "./google-auth.ts";

export const REQUEST_PATH_HEADER = "x-foremention-request-path";

const RSC_CACHE_PARAM = "_rsc";

function isAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/**
 * Normalize a requested URL path (pathname + search) into a safe post-login
 * return path. Returns `fallback` (default "/app") unless the input is a
 * same-origin relative path inside the signed-in app.
 */
export function returnPathFromRequestPath(raw: string | null | undefined, fallback = "/app"): string {
  const safeFallback = isAppPath(safeAuthNext(fallback).split(/[?#]/, 1)[0]) ? safeAuthNext(fallback) : "/app";
  if (typeof raw !== "string" || !raw) return safeFallback;
  // Validate the untouched input first: rejects absolute/scheme-relative URLs,
  // backslashes, control characters and over-long values.
  const checked = safeAuthNext(raw);
  if (checked === "/app" && raw !== "/app") {
    // safeAuthNext's own fallback; only accept it when the input really was /app.
    if (!/^\/app(?:[/?#]|$)/.test(raw)) return safeFallback;
  }
  let url: URL;
  try {
    url = new URL(checked, "https://foremention.invalid");
  } catch {
    return safeFallback;
  }
  if (url.origin !== "https://foremention.invalid") return safeFallback;
  // Client-side navigations fetch the RSC payload (".rsc" suffix and a cache-busting
  // _rsc parameter); the return target is the page itself.
  let pathname = url.pathname.endsWith(".rsc") ? url.pathname.slice(0, -4) || "/" : url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.replace(/\/+$/, "");
  if (!isAppPath(pathname)) return safeFallback;
  url.searchParams.delete(RSC_CACHE_PARAM);
  const search = url.searchParams.toString();
  const candidate = `${pathname}${search ? `?${search}` : ""}`;
  const final = safeAuthNext(candidate);
  return final === candidate ? final : safeFallback;
}

/**
 * Value the Worker forwards for every request. Always derived from the real
 * request URL, never from a client header.
 */
export function requestPathHeaderValue(url: URL): string {
  return `${url.pathname}${url.search}`;
}
