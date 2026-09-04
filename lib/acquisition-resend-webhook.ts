const RESEND_EMAIL_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
  "email.received",
]);

export type ResendWebhookHeaders = {
  id: string;
  timestamp: string;
  signature: string;
};

export type NormalizedResendWebhookEvent = {
  type: string;
  createdAt: string;
  emailId: string;
  messageId: string | null;
};

function decodeBase64(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

export async function verifyResendWebhookSignature(
  payload: string,
  headers: ResendWebhookHeaders,
  secret: string,
  nowMs = Date.now(),
) {
  if (typeof payload !== "string" || !payload) return false;
  if (!headers.id?.trim() || !headers.timestamp?.trim() || !headers.signature?.trim()) return false;
  if (!secret.startsWith("whsec_")) return false;

  const timestamp = Number(headers.timestamp);
  if (!Number.isInteger(timestamp)) return false;
  const nowSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(nowSeconds - timestamp) > 300) return false;

  const secretBytes = decodeBase64(secret.slice("whsec_".length));
  if (!secretBytes?.length) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent)));

  for (const token of headers.signature.trim().split(/\s+/)) {
    const [version, encoded, extra] = token.split(",");
    if (version !== "v1" || !encoded || extra) continue;
    const candidate = decodeBase64(encoded);
    if (candidate && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

function boundedText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\r\n]+/g, " ").slice(0, max);
  return normalized || null;
}

export function normalizeResendWebhookEvent(input: unknown): NormalizedResendWebhookEvent {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("ACQUISITION_RESEND_EVENT_MALFORMED");
  const record = input as Record<string, unknown>;
  const type = boundedText(record.type, 100);
  if (!type || !RESEND_EMAIL_EVENTS.has(type)) throw new Error("ACQUISITION_RESEND_EVENT_UNSUPPORTED");
  const createdAtRaw = boundedText(record.created_at, 100);
  const createdTimestamp = createdAtRaw ? Date.parse(createdAtRaw) : Number.NaN;
  if (!Number.isFinite(createdTimestamp) || createdTimestamp > Date.now() + 5 * 60 * 1000) {
    throw new Error("ACQUISITION_RESEND_EVENT_TIMESTAMP_INVALID");
  }
  const data = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : null;
  const emailId = boundedText(data?.email_id, 300);
  if (!emailId) throw new Error("ACQUISITION_RESEND_EVENT_EMAIL_ID_REQUIRED");
  const messageId = boundedText(data?.message_id, 500);
  return {
    type,
    createdAt: new Date(createdTimestamp).toISOString(),
    emailId,
    messageId,
  };
}
