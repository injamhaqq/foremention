type SourceXrayTarget = { id: string; url: string };

function comparablePageUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    // Source records are canonicalized without "www." (lib/collection-policy.ts),
    // while providers return the URL as published; compare on the same key.
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function findSourceXrayTarget<T extends SourceXrayTarget>(citationUrl: string, sources: T[]): T | null {
  const citationKey = comparablePageUrl(citationUrl);
  if (!citationKey) return null;
  return sources.find((source) => comparablePageUrl(source.url) === citationKey) || null;
}
