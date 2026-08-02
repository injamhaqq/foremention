const encoder = new TextEncoder();

function encode(value: string) {
  let binary = ""; for (const byte of encoder.encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

async function signature(value: string, secret: string) {
  if (secret.length < 32) throw new Error("OAuth state signing is not configured.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function createOAuthState(provider: string, organizationId: string, userId: string, secret: string) {
  const payload = encode(JSON.stringify({ provider, organizationId, userId, expiresAt: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() }));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyOAuthState(state: string, provider: string, organizationId: string, userId: string, secret: string) {
  try {
    const [payload, signed, extra] = state.split(".");
    if (!payload || !signed || extra || signed !== await signature(payload, secret)) return false;
    const parsed = JSON.parse(decode(payload)) as { provider: string; organizationId: string; userId: string; expiresAt: number };
    return parsed.provider === provider && parsed.organizationId === organizationId && parsed.userId === userId && parsed.expiresAt > Date.now();
  } catch { return false; }
}
