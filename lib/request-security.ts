function parseOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedMutationOrigin(request: Request) {
  const sourceOrigin = parseOrigin(request.headers.get("origin"))
    || (request.headers.get("sec-fetch-site") === "same-origin"
      ? parseOrigin(request.headers.get("referer"))
      : null);
  if (!sourceOrigin) return false;

  const allowed = new Set<string>();
  const requestOrigin = parseOrigin(request.url);
  if (requestOrigin) allowed.add(requestOrigin);

  const configuredOrigin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL || null);
  if (configuredOrigin) allowed.add(configuredOrigin);

  // Forwarding headers must not establish trusted origins. Trust only
  // the canonical configured origin and the request URL seen by the runtime.
  return allowed.has(sourceOrigin);
}
