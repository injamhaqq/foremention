export function isTrustedMutationOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;
  try {
    const origin = new URL(originHeader).origin;
    const requestOrigin = new URL(request.url).origin;
    const configured = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : null;
    if (process.env.NODE_ENV === "production") return Boolean(configured && origin === configured);
    return origin === requestOrigin || Boolean(configured && origin === configured);
  } catch {
    return false;
  }
}