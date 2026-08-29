type SourceXrayTarget = { id: string; url: string };

function comparablePageUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
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
