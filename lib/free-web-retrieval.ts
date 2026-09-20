import type { ProviderCitation } from "@/lib/providers/types";

const BING_SEARCH_ENDPOINT = "https://www.bing.com/search";
const MAX_RETRIEVAL_CHARS = 12_000;
const MAX_CITATIONS = 8;

function decodeXml(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower in named) return named[lower];
      const radix = lower.startsWith("#x") ? 16 : 10;
      const numeric = Number.parseInt(lower.replace(/^#x?/, ""), radix);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : "";
    });
}

function textFromXml(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeHttpUrl(value: string) {
  try {
    const url = new URL(decodeXml(value).trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.hostname.toLowerCase().endsWith("bing.com") && /^\/(search|ck\/a)/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type BingSearchResult = ProviderCitation & {
  snippet: string;
};

export function parseBingSearchRss(raw: string): BingSearchResult[] {
  const results = new Map<string, BingSearchResult>();
  const items = raw.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const title = textFromXml(item.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").slice(0, 240);
    const url = normalizeHttpUrl(item.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "");
    const snippet = textFromXml(item.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "").slice(0, 1_200);
    if (!url || results.has(url)) continue;
    results.set(url, { url, title: title || undefined, snippet });
    if (results.size >= MAX_CITATIONS) break;
  }

  return Array.from(results.values());
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "bing-rss";
};

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const url = new URL(BING_SEARCH_ENDPOINT);
  url.searchParams.set("format", "rss");
  url.searchParams.set("q", normalized);
  url.searchParams.set("count", String(MAX_CITATIONS));
  url.searchParams.set("setlang", "en-US");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      "user-agent": "Foremention/1.0 evidence-retrieval",
    },
    signal,
  });
  if (!response.ok) throw new Error(`Bing RSS retrieval failed with HTTP ${response.status}.`);

  const raw = (await response.text()).trim();
  if (!raw) throw new Error("Bing RSS returned no evidence content.");

  const results = parseBingSearchRss(raw);
  if (!results.length) throw new Error("Bing RSS returned no verifiable source URLs.");

  const content = results.map((result, index) => [
    `SOURCE [${index + 1}]`,
    `Title: ${result.title || new URL(result.url).hostname}`,
    `URL: ${result.url}`,
    result.snippet ? `Snippet: ${result.snippet}` : "",
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, MAX_RETRIEVAL_CHARS);

  return {
    content,
    citations: results.map(({ url: sourceUrl, title }) => ({ url: sourceUrl, title })),
    retrievalProvider: "bing-rss",
  };
}
