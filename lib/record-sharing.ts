const TOKEN_BYTES = 32;
const DEFAULT_SHARE_DAYS = 14;
const MAX_SHARE_DAYS = 90;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createRecordShareToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export async function hashRecordShareToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("Invalid record share token.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return hex(new Uint8Array(digest));
}

export function recordShareExpiry(days = DEFAULT_SHARE_DAYS, now = new Date()) {
  const safeDays = Number.isInteger(days) ? Math.max(1, Math.min(MAX_SHARE_DAYS, days)) : DEFAULT_SHARE_DAYS;
  return new Date(now.getTime() + safeDays * 86_400_000);
}

export function recordShareIsActive(share: { expiresAt: string; revokedAt?: string | null }, now = new Date()) {
  if (share.revokedAt) return false;
  const expiry = new Date(share.expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry > now;
}

export function safeRecordSharePath(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Invalid record share token.");
  return `/share/record/${token.toLowerCase()}`;
}
