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

  // Cloudflare may execute the Worker on an internal URL while preserving the
  // browser-facing hostname in forwarding headers. Require the submitted
  // Origin/Referer to match that exact public origin; never trust the header
  // as a destination by itself.
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || (requestOrigin ? new URL(requestOrigin).protocol.replace(":", "") : "https");
  if (forwardedHost && /^(?:[a-z0-9-]+\.)*[a-z0-9-]+(?::\d+)?$/i.test(forwardedHost)) {
    const forwardedOrigin = parseOrigin(`${forwardedProtocol}://${forwardedHost}`);
    if (forwardedOrigin) allowed.add(forwardedOrigin);
  }

  return allowed.has(sourceOrigin);
}
