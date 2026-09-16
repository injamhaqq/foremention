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

export function authorizeOutreachMiniAuditRequest(request: Request, expectedSecret: string | undefined | null) {
  const secret = String(expectedSecret || "").trim();
  if (!secret) return false;
  const header = String(request.headers.get("authorization") || "").trim();
  if (!header.toLocaleLowerCase().startsWith("bearer ")) return false;
  const candidate = header.slice(7).trim();
  if (!candidate) return false;
  return constantTimeTextEqual(candidate, secret);
}
