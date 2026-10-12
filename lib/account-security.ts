const textEncoder = new TextEncoder();

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createOpaqueToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function accessTokenAgeSeconds(token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as { iat?: number };
    if (!Number.isFinite(payload.iat)) return Number.POSITIVE_INFINITY;
    return Math.max(0, nowSeconds - Number(payload.iat));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function isRecentAccessToken(token: string | undefined, maxAgeSeconds = 10 * 60) {
  return Boolean(token && accessTokenAgeSeconds(token) <= maxAgeSeconds);
}

/**
 * Fail-closed recovery *eligibility* check. JWT claims are untrusted until
 * Supabase Auth verifies the same bearer token (session adoption / password
 * change); this must NEVER be used as a standalone identity verifier.
 * A refresh-token issue time is not proof of recent password recovery.
 */
export function hasRecentRecoveryAmrClaim(token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    const claims = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as {
      role?: unknown;
      exp?: unknown;
      amr?: unknown;
    };
    if (claims.role !== "authenticated" || typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= nowSeconds || !Array.isArray(claims.amr)) return false;
    return claims.amr.some((entry: unknown) => {
      if (!entry || typeof entry !== "object") return false;
      const method = entry as { method?: unknown; timestamp?: unknown };
      return method.method === "recovery"
        && typeof method.timestamp === "number"
        && Number.isFinite(method.timestamp)
        && method.timestamp <= nowSeconds + 30
        && nowSeconds - method.timestamp <= 15 * 60;
    });
  } catch {
    return false;
  }
}
