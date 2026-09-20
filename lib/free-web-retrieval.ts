import type { ProviderCitation } from "@/lib/providers/types";

const BING_SEARCH_ENDPOINT = "https://www.bing.com/search";
const MAX_RSS_CHARS = 256_000;
const MAX_RETRIEVAL_CHARS = 12_000;
const MAX_CITATIONS = 8;

const RETRIEVAL_STOPWORDS = new Set([
  "a", "an", "and", "answer", "according", "at", "cannot", "cite", "current", "evidence",
  "exact", "for", "from", "if", "in", "is", "it", "most", "now", "of", "official", "on",
  "or", "rather", "say", "search", "so", "source", "the", "time", "to", "url", "use", "used",
  "verify", "web", "website", "what", "when", "which", "with", "you", "your",
]);

export function extractRequestedDomains(query: string) {
  const domains = new Set<string>();
  const pattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,24})(?:\/[^\s<>"']*)?/gi;
  for (const match of query.matchAll(pattern)) {
    const domain = String(match[1] || "").toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (domain) domains.add(domain);
  }
  return Array.from(domains).slice(0, 3);
}

function domainMatches(hostname: string, domain: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const target = domain.toLowerCase().replace(/^www\./, "");
  return host === target || host.endsWith(`.${target}`);
}

export function buildBingSearchQuery(query: string) {
  const normalized = query.normalize("NFKC").split(/\s+/).filter(Boolean).join(" ").trim();
  const domains = extractRequestedDomains(normalized);
  const tokens = normalized
    .toLowerCase()
    .replace(/https?:\/\//g, " ")
    .replace(/[^a-z0-9.-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^www\./, "").replace(/[.]+$/, ""))
    .filter((token) => token.length >= 3 && !RETRIEVAL_STOPWORDS.has(token) && !domains.includes(token));

  const keywords = Array.from(new Set(tokens)).slice(0, 10);
  const siteScope = domains.length === 1 ? `site:${domains[0]}` : "";
  const compact = [siteScope, ...keywords].filter(Boolean).join(" ").trim();
  return compact || normalized.slice(0, 240);
}

export function filterResultsForRequestedDomains(results: BingSearchResult[], domains: string[]) {
  if (!domains.length) return results;
  return results.filter((result) => {
    try {
      return domains.some((domain) => domainMatches(new URL(result.url).hostname, domain));
    } catch {
      return false;
    }
  });
}

function decodeXml(value: string) {
  let result = "";
  for (let index = 0; index < value.length;) {
    if (value[index] !== "&") {
      result += value[index];
      index += 1;
      continue;
    }

    const semi = value.indexOf(";", index + 1);
    if (semi < 0 || semi - index > 12) {
      result += "&";
      index += 1;
      continue;
    }

    const entity = value.slice(index + 1, semi);
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
    };
    const lower = entity.toLowerCase();
    let decoded = named[lower];

    if (decoded === undefined && lower.startsWith("#")) {
      const hex = lower.startsWith("#x");
      const digits = lower.slice(hex ? 2 : 1);
      const numeric = Number.parseInt(digits, hex ? 16 : 10);
      if (digits && Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff) {
        decoded = String.fromCodePoint(numeric);
      }
    }

    if (decoded === undefined) {
      result += value.slice(index, semi + 1);
    } else {
      result += decoded;
    }
    index = semi + 1;
  }
  return result;
}

function stripTags(value: string) {
  let result = "";
  let inTag = false;
  for (const character of value) {
    if (character === "<") {
      inTag = true;
      continue;
    }
    if (character === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) result += character;
  }
  return result;
}

function textFromXml(value: string) {
  let normalized = value.trim();
  if (normalized.startsWith("<![CDATA[") && normalized.endsWith("]]>")) {
    normalized = normalized.slice(9, -3);
  }
  return decodeXml(stripTags(normalized)).split(/\s+/).filter(Boolean).join(" ");
}

function extractTagValue(fragment: string, tagName: string) {
  const lower = fragment.toLowerCase();
  const openStart = lower.indexOf(`<${tagName.toLowerCase()}`);
  if (openStart < 0) return "";
  const openEnd = fragment.indexOf(">", openStart);
  if (openEnd < 0) return "";
  const closeStart = lower.indexOf(`</${tagName.toLowerCase()}>`, openEnd + 1);
  if (closeStart < 0) return "";
  return fragment.slice(openEnd + 1, closeStart);
}

function normalizeHttpUrl(value: string) {
  try {
    const url = new URL(decodeXml(value).trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    if ((host === "bing.com" || host.endsWith(".bing.com")) && (path === "/search" || path.startsWith("/ck/a"))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type BingSearchResult = ProviderCitation & {
  snippet: string;
};

export function parseBingSearchRss(input: string): BingSearchResult[] {
  const raw = input.slice(0, MAX_RSS_CHARS);
  const lower = raw.toLowerCase();
  const results = new Map<string, BingSearchResult>();
  let cursor = 0;

  while (cursor < raw.length && results.size < MAX_CITATIONS) {
    const itemStart = lower.indexOf("<item", cursor);
    if (itemStart < 0) break;
    const itemOpenEnd = raw.indexOf(">", itemStart);
    if (itemOpenEnd < 0) break;
    const itemEnd = lower.indexOf("</item>", itemOpenEnd + 1);
    if (itemEnd < 0) break;

    const item = raw.slice(itemOpenEnd + 1, itemEnd);
    const title = textFromXml(extractTagValue(item, "title")).slice(0, 240);
    const url = normalizeHttpUrl(extractTagValue(item, "link"));
    const snippet = textFromXml(extractTagValue(item, "description")).slice(0, 1_200);

    if (url && !results.has(url)) {
      results.set(url, { url, title: title || undefined, snippet });
    }
    cursor = itemEnd + 7;
  }

  return Array.from(results.values());
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "bing-rss";
};

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").split(/\s+/).filter(Boolean).join(" ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const requestedDomains = extractRequestedDomains(normalized);
  const searchQuery = buildBingSearchQuery(normalized);
  const url = new URL(BING_SEARCH_ENDPOINT);
  url.searchParams.set("format", "rss");
  url.searchParams.set("q", searchQuery);
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

  const raw = (await response.text()).slice(0, MAX_RSS_CHARS).trim();
  if (!raw) throw new Error("Bing RSS returned no evidence content.");

  const parsedResults = parseBingSearchRss(raw);
  if (!parsedResults.length) throw new Error("Bing RSS returned no verifiable source URLs.");

  const results = filterResultsForRequestedDomains(parsedResults, requestedDomains);
  if (!results.length && requestedDomains.length) {
    throw new Error(`Bing RSS returned no citations matching the explicitly requested domain: ${requestedDomains.join(", ")}.`);
  }
  if (!results.length) throw new Error("Bing RSS returned no usable source URLs.");

  const evidenceText = results.map((result, index) => [
    `SOURCE [${index + 1}]`,
    `Title: ${result.title || new URL(result.url).hostname}`,
    `URL: ${result.url}`,
    result.snippet ? `Snippet: ${result.snippet}` : "",
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, MAX_RETRIEVAL_CHARS);

  return {
    content: evidenceText,
    citations: results.map(({ url: sourceUrl, title }) => ({ url: sourceUrl, title })),
    retrievalProvider: "bing-rss",
  };
}
