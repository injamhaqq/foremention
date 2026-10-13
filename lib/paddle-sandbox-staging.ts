/**
 * FM-09: explicit, narrow Paddle SANDBOX staging gate.
 *
 * A production build (NODE_ENV=production) normally refuses every Paddle path.
 * The only exception is an isolated staging host that an operator configures
 * explicitly, and only while every one of these holds:
 *
 * - PADDLE_SANDBOX_STAGING_HOST names a single hostname that is NOT
 *   foremention.com or any *.foremention.com host;
 * - NEXT_PUBLIC_SITE_URL is https and its hostname equals that staging host;
 * - PADDLE_ENVIRONMENT=sandbox, PADDLE_SANDBOX_ADAPTER_ENABLED=1 and
 *   PADDLE_LIVE_ENABLED is not "1";
 * - PADDLE_API_KEY is a Paddle Sandbox key (pdl_sdbx_ prefix);
 * - for request-scoped surfaces (/pay), the request Host equals the staging host.
 *
 * Paddle Live is never enabled by this gate.
 */
const STAGING_HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PRODUCTION_HOST = /(^|\.)foremention\.com$/;

function env(name: string) { return process.env[name]?.trim() || ""; }

function normalizeHost(value: string | null | undefined) {
  if (!value) return "";
  const host = value.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return host;
}

/** The configured isolated staging hostname, or null when the gate is closed. */
export function paddleSandboxStagingHost(): string | null {
  const host = normalizeHost(env("PADDLE_SANDBOX_STAGING_HOST"));
  if (!host || !STAGING_HOST.test(host) || PRODUCTION_HOST.test(host)) return null;
  if (env("PADDLE_ENVIRONMENT") !== "sandbox") return null;
  if (env("PADDLE_SANDBOX_ADAPTER_ENABLED") !== "1") return null;
  if (env("PADDLE_LIVE_ENABLED") === "1") return null;
  if (!env("PADDLE_API_KEY").startsWith("pdl_sdbx_")) return null;
  let site: URL;
  try { site = new URL(env("NEXT_PUBLIC_SITE_URL")); } catch { return null; }
  if (site.protocol !== "https:" || normalizeHost(site.hostname) !== host) return null;
  return host;
}

/** Process-level: may the Paddle sandbox adapter run in this runtime at all? */
export function paddleSandboxRuntimeAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return paddleSandboxStagingHost() !== null;
}

/** Request-level: may this request's host render Paddle sandbox checkout? */
export function paddleSandboxRequestAllowed(requestHost: string | null | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const staging = paddleSandboxStagingHost();
  return staging !== null && normalizeHost(requestHost) === staging;
}
