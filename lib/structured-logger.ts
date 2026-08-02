type SafeLogValue = string | number | boolean | null | undefined;

const safeKeys = new Set(["correlationId", "route", "method", "status", "durationMs", "runId", "provider", "attempt", "errorCode", "event"]);

/** Emits only allow-listed operational metadata. Never pass prompt, answer, email, IP, URL query, token, or secret values. */
export function logOperationalEvent(event: string, fields: Record<string, SafeLogValue> = {}) {
  const safe: Record<string, SafeLogValue> = { event };
  for (const [key, value] of Object.entries(fields)) if (safeKeys.has(key)) safe[key] = value;
  console.info(JSON.stringify(safe));
}

export function correlationIdFor(request: Request) {
  const supplied = request.headers.get("x-correlation-id") || "";
  return /^[a-zA-Z0-9_-]{16,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}
