type AcquisitionUnsubscribePayload = {
  purpose: "acquisition_unsubscribe";
  accountId: string;
  contactId: string;
  expiresAt: number;
};

const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAcquisitionUnsubscribeToken(
  accountId: string,
  contactId: string,
  secret: string,
  now = Date.now(),
) {
  if (!uuid.test(accountId) || !uuid.test(contactId) || secret.length < 32) {
    throw new Error("Acquisition unsubscribe signing is not configured.");
  }
  const payload: AcquisitionUnsubscribePayload = {
    purpose: "acquisition_unsubscribe",
    accountId,
    contactId,
    expiresAt: now + TOKEN_TTL_MS,
  };
  const encoded = base64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(encoded));
  return `${encoded}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyAcquisitionUnsubscribeToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<Omit<AcquisitionUnsubscribePayload, "purpose"> | null> {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || secret.length < 32) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as AcquisitionUnsubscribePayload;
    if (
      parsed.purpose !== "acquisition_unsubscribe" ||
      !uuid.test(parsed.accountId) ||
      !uuid.test(parsed.contactId) ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt < now
    ) return null;
    return { accountId: parsed.accountId, contactId: parsed.contactId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
