const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalizes user-visible text before validation and persistence. */
export function cleanText(value: unknown, limit: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(controlCharacters, " ").trim().slice(0, limit);
}

export function cleanStringArray(value: unknown, itemLimit: number, maxItems: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanText(item, itemLimit)).filter(Boolean))).slice(0, maxItems);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function publicHttpsUrl(value: unknown, limit = 1000) {
  const candidate = cleanText(value, limit);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Rejects malformed JSON and non-object request bodies without throwing. */
export async function readJsonObject(request: Request, maxBytes = 50_000): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(contentLength) || contentLength > maxBytes) return null;
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
}
