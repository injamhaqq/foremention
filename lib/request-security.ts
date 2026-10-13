function parseOrigin(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function parseBrowserOrigin(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    // Origin is not a full URL. Do not normalize path, credentials, or other
    // URL syntax into an apparently trusted origin.
    if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.origin !== value) return null;
    return parseOrigin(value);
  } catch {
    return null;
  }
}

export function isTrustedMutationOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  // Fetch Metadata is a second browser signal, never an authority that can
  // override a mismatching or malformed Origin header.
  if (fetchSite === "cross-site") return false;
  const originHeader = request.headers.get("origin");
  const sourceOrigin = originHeader !== null
    ? parseBrowserOrigin(originHeader)
    : (fetchSite === "same-origin" ? parseOrigin(request.headers.get("referer")) : null);
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
