import type { ProviderCitation } from "@/lib/providers/types";
import { inspectSourceUrl, validatePublicSourceUrl } from "@/lib/source-inspection";

const MAX_SEARCH_CITATIONS = 8;
const MAX_FETCHED_SOURCES = 4;
const MAX_RETRIEVAL_CHARS = 14_000;

function normalizeHttpUrl(value: string) {
  const candidate = value.trim().replace(/[),.;:]+$/, "");
  try {
    return validatePublicSourceUrl(candidate).toString();
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
  const hrefPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const url = unwrapSearchUrl(match[1], baseUrl);
    if (!url || citations.has(url)) continue;
    citations.set(url, { url, title: new URL(url).hostname.replace(/^www\./, "") });
    if (citations.size >= MAX_SEARCH_CITATIONS) break;
  }
  return Array.from(citations.values());
}

export function seedUrlsFromQuery(query: string): ProviderCitation[] {
  const seen = new Map<string, ProviderCitation>();
  const pattern = /(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,24}(?:\/[^\s<>"']*)?/gi;
  for (const match of query.matchAll(pattern)) {
    const raw = match[0];
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = normalizeHttpUrl(withScheme);
    if (!url || seen.has(url)) continue;
    seen.set(url, { url, title: new URL(url).hostname.replace(/^www\./, "") });
    if (seen.size >= MAX_SEARCH_CITATIONS) break;
  }
  return Array.from(seen.values());
}

async function inspectEvidenceSource(citation: ProviderCitation) {
  const inspected = await inspectSourceUrl(citation.url, {
    includePageText: true,
    maxExtractedTextChars: 4_000,
    maxBytes: 192 * 1024,
    timeoutMs: 8_000,
    allowTruncatedBody: true,
  });
  if (!["open", "partial"].includes(inspected.access) || !inspected.pageText || inspected.pageText.length < 160) return null;
  const finalUrl = normalizeHttpUrl(inspected.finalUrl);
  if (!finalUrl) return null;
  return {
    citation: {
      url: finalUrl,
      title: inspected.pageTitle?.trim().slice(0, 240) || citation.title || new URL(finalUrl).hostname,
    },
    text: inspected.pageText.slice(0, 4_000),
  };
}

async function discoverSearchUrls(query: string, signal?: AbortSignal) {
  const encoded = encodeURIComponent(query);
  const candidates = [
    `https://search.brave.com/search?q=${encoded}&source=web`,
    `https://html.duckduckgo.com/html/?q=${encoded}`,
    `https://www.bing.com/search?q=${encoded}`,
  ];

  for (const searchUrl of candidates) {
    try {
      const response = await fetch(searchUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 (compatible; ForementionEvidence/1.0; +https://foremention.com)",
        },
        signal,
      });
      if (!response.ok) continue;
      const html = (await response.text()).slice(0, 500_000);
      const citations = parseSearchHtmlLinks(html, searchUrl);
      if (citations.length) return citations;
    } catch {
      // Try the next fixed, keyless public search surface. No paid or authenticated fallback is allowed.
    }
  }
  return [];
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "keyless-web-retrieval";
};

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const seeded = seedUrlsFromQuery(normalized);
  let discovered = seeded;
  let inspected = (await Promise.all(seeded.slice(0, MAX_FETCHED_SOURCES).map(inspectEvidenceSource)))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!inspected.length) {
    discovered = await discoverSearchUrls(normalized, signal);
    if (!discovered.length) throw new Error("Keyless web discovery returned no verifiable public source URLs.");
    inspected = (await Promise.all(discovered.slice(0, MAX_FETCHED_SOURCES).map(inspectEvidenceSource)))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  if (!inspected.length) throw new Error("Web discovery found public URLs, but none passed safe source inspection with usable content.");

  const citations = inspected.map((item) => item.citation);
  const content = inspected
    .map((item, index) => `SOURCE [${index + 1}]\nTitle: ${item.citation.title || new URL(item.citation.url).hostname}\nURL: ${item.citation.url}\n${item.text}`)
    .join("\n\n")
    .slice(0, MAX_RETRIEVAL_CHARS);

  return { content, citations, retrievalProvider: "keyless-web-retrieval" };
}
