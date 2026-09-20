import type { ProviderCitation } from "@/lib/providers/types";

const MAX_SEARCH_CITATIONS = 8;
const MAX_RETRIEVAL_CHARS = 14_000;

function publicHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (/^(?:10|127)\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return false;
  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;
  return true;
}

function normalizeHttpUrl(value: string) {
  const candidate = value.trim().replace(/[),.;:]+$/, "");
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!publicHostname(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function searchHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === "search.brave.com"
    || host === "duckduckgo.com"
    || host === "html.duckduckgo.com"
    || host === "bing.com";
}

function unwrapSearchUrl(raw: string, base: string) {
  const decoded = decodeEntities(raw.trim());
  let absolute: URL;
  try {
    absolute = new URL(decoded, base);
  } catch {
    return null;
  }

  if (absolute.hostname.endsWith("duckduckgo.com")) {
    const target = absolute.searchParams.get("uddg");
    if (target) return normalizeHttpUrl(target);
  }
  if (absolute.hostname.endsWith("bing.com") && absolute.pathname.startsWith("/ck/")) return null;
  if (searchHost(absolute.hostname)) return null;
  return normalizeHttpUrl(absolute.toString());
}

export function parseSearchHtmlLinks(html: string, baseUrl: string): ProviderCitation[] {
  const citations = new Map<string, ProviderCitation>();
  const hrefPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const url = unwrapSearchUrl(match[1], baseUrl);
    if (!url || citations.has(url)) continue;
    const anchorText = decodeEntities(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    citations.set(url, {
      url,
      title: (anchorText || new URL(url).hostname.replace(/^www\./, "")).slice(0, 240),
    });
    if (citations.size >= MAX_SEARCH_CITATIONS) break;
  }
  return Array.from(citations.values());
}

function readableText(html: string) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(?:script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg|template)>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:p|div|article|section|li|h[1-6]|tr|a)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  ).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "keyless-search-evidence";
};

async function searchBrave(query: string, signal?: AbortSignal) {
  const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ForementionEvidence/1.0; +https://foremention.com)",
    },
    signal,
  });
  if (!response.ok) return null;
  const html = (await response.text()).slice(0, 500_000);
  return { html, url };
}

async function searchDuckDuckGo(query: string, signal?: AbortSignal) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ForementionEvidence/1.0; +https://foremention.com)",
    },
    signal,
  });
  if (!response.ok) return null;
  const html = (await response.text()).slice(0, 500_000);
  return { html, url };
}

async function searchBing(query: string, signal?: AbortSignal) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ForementionEvidence/1.0; +https://foremention.com)",
    },
    signal,
  });
  if (!response.ok) return null;
  const html = (await response.text()).slice(0, 500_000);
  return { html, url };
}

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const searchers = [searchBrave, searchDuckDuckGo, searchBing];
  for (const search of searchers) {
    try {
      const result = await search(normalized, signal);
      if (!result) continue;
      const citations = parseSearchHtmlLinks(result.html, result.url);
      if (!citations.length) continue;

      const visibleEvidence = readableText(result.html).slice(0, MAX_RETRIEVAL_CHARS);
      if (visibleEvidence.length < 160) continue;

      return {
        content: [
          "CURRENT SEARCH RESULT EVIDENCE",
          "Use only statements visible in this search-result evidence. Do not assume the underlying pages say anything beyond the visible result text.",
          visibleEvidence,
        ].join("\n\n"),
        citations,
        retrievalProvider: "keyless-search-evidence",
      };
    } catch {
      // Try the next fixed public search origin. No authenticated or paid fallback is allowed here.
    }
  }

  throw new Error("Keyless web discovery returned no verifiable search-result evidence.");
}
