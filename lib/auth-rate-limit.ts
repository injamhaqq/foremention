/**
 * FM-01 (capacity track): login and auth rate limits.
 *
 * The Worker calls Supabase Auth from Cloudflare's network, so Supabase's own
 * per-IP limits see Foremention's egress, not the visitor. These limits run in
 * the Worker before the route handler, per visitor network and (for password
 * sign-in) per account, so credential stuffing against one account is slowed
 * even when it is spread across many networks.
 *
 * Counting is one atomic D1 upsert per key (no read-then-write race), in the
 * existing `public_tool_rate_limits` table; no schema change. The fingerprint
 * is a salted SHA-256 of the network address or the normalized email, so no IP
 * address or email is ever stored or logged.
 */
export type AuthRateRule = {
  endpoint: string;
  /** Attempts per network per window. */
  limit: number;
  windowMs: number;
  /** Optional per-account (email) limit for the same window. */
  perAccountLimit?: number;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Method-specific rules for auth routes. Signup and recovery mail limits stay in worker/index.ts. */
const AUTH_RULES: ReadonlyArray<{ method: string; path: string; rule: AuthRateRule }> = [
  { method: "POST", path: "/api/auth/login", rule: { endpoint: "auth-login", limit: 20, windowMs: 15 * MINUTE, perAccountLimit: 10 } },
  { method: "POST", path: "/api/auth/verify", rule: { endpoint: "auth-verify", limit: 20, windowMs: 15 * MINUTE } },
  { method: "POST", path: "/api/auth/session", rule: { endpoint: "auth-session", limit: 30, windowMs: 15 * MINUTE } },
  { method: "POST", path: "/api/auth/password", rule: { endpoint: "auth-password", limit: 10, windowMs: HOUR } },
  { method: "GET", path: "/api/auth/refresh", rule: { endpoint: "auth-refresh", limit: 120, windowMs: HOUR } },
  { method: "POST", path: "/api/auth/sso", rule: { endpoint: "auth-sso", limit: 20, windowMs: HOUR } },
  { method: "GET", path: "/api/auth/google", rule: { endpoint: "auth-google", limit: 60, windowMs: HOUR } },
  { method: "POST", path: "/api/auth/demo", rule: { endpoint: "auth-demo", limit: 30, windowMs: HOUR } },
];

export function authRateLimitRule(pathname: string, method: string): AuthRateRule | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const match = AUTH_RULES.find((entry) => entry.method === method.toUpperCase() && entry.path === normalized);
  return match ? match.rule : null;
}

export interface WindowedLimitStatement {
  bind(...values: unknown[]): WindowedLimitStatement;
  first<T = unknown>(): Promise<T | null>;
}

export interface WindowedLimitStore {
  prepare(query: string): WindowedLimitStatement;
}

/**
 * One statement: start a new window when the previous one has elapsed,
 * otherwise increment. SQLite evaluates every SET expression against the old
 * row, so the window check and the count stay consistent.
 *
 * Placeholders are anonymous `?` bound in order (now and windowMs repeated)
 * rather than numbered `?NNN`: Node 22.13's node:sqlite (the CI runtime) cannot
 * bind positional values to numbered parameters ("column index out of range"),
 * while plain `?` behaves the same in D1, node:sqlite and every SQLite driver.
 */
export const ATOMIC_WINDOW_SQL = "INSERT INTO public_tool_rate_limits (endpoint, fingerprint_hash, window_started_at, request_count) VALUES (?, ?, ?, 1) "
  + "ON CONFLICT(endpoint, fingerprint_hash) DO UPDATE SET "
  + "window_started_at = CASE WHEN ? - window_started_at >= ? THEN ? ELSE window_started_at END, "
  + "request_count = CASE WHEN ? - window_started_at >= ? THEN 1 ELSE request_count + 1 END "
  + "RETURNING request_count";

/** Count one attempt; true while the attempt is within the limit. */
export async function admitWindowedAttempt(store: WindowedLimitStore, input: { endpoint: string; fingerprint: string; limit: number; windowMs: number; now?: number }) {
  const now = input.now ?? Date.now();
  const row = await store.prepare(ATOMIC_WINDOW_SQL)
    .bind(input.endpoint, input.fingerprint, now, now, input.windowMs, now, now, input.windowMs)
    .first<{ request_count: number }>();
  return Boolean(row && typeof row.request_count === "number" && row.request_count <= input.limit);
}

/** Normalized account identifier from a sign-in body, or null. Never logged. */
export function loginAccountIdentifier(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const email = (body as Record<string, unknown>).email;
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase().slice(0, 254);
  return normalized.includes("@") ? normalized : null;
}

export const AUTH_RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes before trying again.";
