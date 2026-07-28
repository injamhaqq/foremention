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
