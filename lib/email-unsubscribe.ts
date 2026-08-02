type UnsubscribePayload = { organizationId: string; userId: string; expiresAt: number };

const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const base64Url = (bytes: Uint8Array) => {
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const fromBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createEmailUnsubscribeToken(organizationId: string, userId: string, secret: string, now = Date.now()) {
  if (!uuid.test(organizationId) || !uuid.test(userId) || secret.length < 32) throw new Error("Email unsubscribe signing is not configured.");
  const payload = base64Url(encoder.encode(JSON.stringify({ organizationId, userId, expiresAt: now + 180 * 24 * 60 * 60 * 1000 })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload));
  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyEmailUnsubscribeToken(token: string, secret: string, now = Date.now()): Promise<UnsubscribePayload | null> {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || secret.length < 32) return null;
    const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), fromBase64Url(signature), encoder.encode(payload));
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as UnsubscribePayload;
    if (!uuid.test(parsed.organizationId) || !uuid.test(parsed.userId) || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt < now) return null;
    return parsed;
  } catch { return null; }
}
