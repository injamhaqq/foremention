import { createHash, createPublicKey, verify } from "node:crypto";

export const TRUSTED_OUTREACH_SIGNING_PUBLIC_KEYS = [
  // Railway Foremention Outreach production signing identity.
  "MCowBQYDK2VwAyEAYpCFhyVEP4NhEvi3oKYEYRD-f9yjGmlTeg3l_qv_RK4",
] as string[];

function constantTimeTextEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    mismatch |= leftCode ^ rightCode;
  }
  return mismatch === 0;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : stableValue(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (item === undefined || typeof item === "function" || typeof item === "symbol") continue;
      out[key] = stableValue(item);
    }
    return out;
  }
  return value;
}

export function stableOutreachMiniAuditJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function signedPayload(input: {
  timestamp: string;
  method: string;
  path: string;
  bodyText: string;
}) {
  const bodyHash = createHash("sha256").update(input.bodyText, "utf8").digest("hex");
  return [
    "foremention-outreach-v1",
    input.timestamp,
    input.method.toUpperCase(),
    input.path,
    bodyHash,
  ].join("\n");
}

function publicKeyId(publicKeyBase64Url: string) {
  return createHash("sha256").update(publicKeyBase64Url, "utf8").digest("hex").slice(0, 16);
}

export function authorizeOutreachMiniAuditRequest(request: Request, expectedSecret: string | undefined | null) {
  const secret = String(expectedSecret || "").trim();
  if (!secret) return false;
  const header = String(request.headers.get("authorization") || "").trim();
  if (!header.toLocaleLowerCase().startsWith("bearer ")) return false;
  const candidate = header.slice(7).trim();
  if (!candidate) return false;
  return constantTimeTextEqual(candidate, secret);
}

export function authorizeSignedOutreachMiniAuditRequest(
  request: Request,
  body: unknown,
  publicKeys: readonly string[] = TRUSTED_OUTREACH_SIGNING_PUBLIC_KEYS,
  nowMs = Date.now(),
) {
  const timestamp = String(request.headers.get("x-foremention-timestamp") || "").trim();
  const signatureText = String(request.headers.get("x-foremention-signature") || "").trim();
  const requestedKeyId = String(request.headers.get("x-foremention-key-id") || "").trim();
  if (!timestamp || !signatureText || !publicKeys.length) return false;

  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(nowMs - signedAt) > 5 * 60 * 1000) return false;

  const bodyText = stableOutreachMiniAuditJson(body);
  const payload = signedPayload({
    timestamp,
    method: request.method,
    path: new URL(request.url).pathname,
    bodyText,
  });

  let signature: Buffer;
  try {
    signature = Buffer.from(signatureText, "base64url");
  } catch {
    return false;
  }

  for (const publicKeyText of publicKeys) {
    if (!publicKeyText) continue;
    if (requestedKeyId && publicKeyId(publicKeyText) !== requestedKeyId) continue;
    try {
      const key = createPublicKey({
        key: Buffer.from(publicKeyText, "base64url"),
        format: "der",
        type: "spki",
      });
      if (verify(null, Buffer.from(payload, "utf8"), key, signature)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function outreachMiniAuditAuthConfigured(secret: string | undefined | null) {
  return Boolean(String(secret || "").trim()) || TRUSTED_OUTREACH_SIGNING_PUBLIC_KEYS.length > 0;
}
