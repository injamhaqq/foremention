import type { ProviderCitation } from "@/lib/providers/types";

const BING_SEARCH_ENDPOINT = "https://www.bing.com/search";
const MAX_RSS_CHARS = 256_000;
const MAX_RETRIEVAL_CHARS = 12_000;
const MAX_CITATIONS = 8;

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

/**
 * Explicit source-domain requirement extracted from a buyer question (#345).
 *
 * A scope is produced ONLY when the request names exactly one web domain and
 * explicitly requires that provenance (for example "according to the official
 * OpenAI website ... openai.com/news" or "cite the exact openai.com source URL").
 * Ordinary comparison questions, and questions naming several domains, are
 * never site-scoped.
 */
export type SourceDomainScope = {
  domain: string;
  pathPrefix: string | null;
};

const DOMAIN_PATTERN = /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|ai|co|dev|app|gov|edu|info|news|blog|tech|cloud|so|xyz|us|uk|de|fr|in|bd))(\/[a-z0-9\-._~/%]*)?/gi;
const PROVENANCE_REQUIREMENT = /\b(official\s+(?:[\w.-]+\s+){0,3}(?:website|site|domain|blog|newsroom|page|source)|from\s+the\s+official|exact\s+(?:[\w.-]+\s+){0,2}(?:source\s+)?url|only\s+(?:cite|use)\s+(?:sources?\s+)?from)\b/i;
const QUERY_STOPWORDS = new Set([
  "a", "about", "according", "after", "an", "and", "answer", "answering", "are", "as", "at", "be", "by", "can", "cannot",
  "cite", "current", "date", "did", "do", "does", "evidence", "exact", "for", "from", "has", "have", "how", "i", "if", "in",
  "is", "it", "its", "memory", "most", "now", "of", "official", "on", "or", "rather", "recent", "recently", "say", "search",
  "site", "so", "source", "than", "that", "the", "their", "this", "time", "to", "url", "use", "used", "verify", "was", "web",
  "website", "what", "when", "which", "with", "you", "your",
]);

export function sourceDomainScopeFromPrompt(prompt: string): SourceDomainScope | null {
  const text = prompt.normalize("NFKC");
  if (!PROVENANCE_REQUIREMENT.test(text)) return null;
  const found = new Map<string, string | null>();
  for (const match of text.matchAll(DOMAIN_PATTERN)) {
    const domain = match[1].toLowerCase().replace(/^www\./, "");
    const rawPath = (match[2] || "").replace(/[.,;:!?)]+$/, "").replace(/\/+$/, "");
    const pathPrefix = rawPath && rawPath !== "/" ? rawPath.toLowerCase() : null;
    const existing = found.get(domain);
    // Keep a path prefix only if every mention of the domain agrees on it.
    found.set(domain, found.has(domain) && existing !== pathPrefix ? null : pathPrefix);
  }
  if (found.size !== 1) return null;
  const [[domain, pathPrefix]] = Array.from(found.entries());
  return { domain, pathPrefix };
}

/** Concise, bounded, domain-qualified retrieval query (documented normalization). */
export function domainScopedQuery(prompt: string, scope: SourceDomainScope) {
  const withoutDomains = prompt.normalize("NFKC").toLowerCase().replace(DOMAIN_PATTERN, " ");
  const keywords: string[] = [];
  for (const token of withoutDomains.split(/[^a-z0-9]+/)) {
    if (token.length < 3 || QUERY_STOPWORDS.has(token) || keywords.includes(token)) continue;
    keywords.push(token);
    if (keywords.length >= 8) break;
  }
  const site = `site:${scope.domain}${scope.pathPrefix || ""}`;
  return [site, ...keywords].join(" ").slice(0, 200).trim();
}

export function citationMatchesScope(url: string, scope: SourceDomainScope) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== scope.domain && !host.endsWith(`.${scope.domain}`)) return false;
    if (!scope.pathPrefix) return true;
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
    return path === scope.pathPrefix || path.startsWith(`${scope.pathPrefix}/`);
  } catch {
    return false;
  }
}

export class SourceScopeUnavailableError extends Error {
  readonly scope: SourceDomainScope;
  readonly retrievedCount: number;
  constructor(scope: SourceDomainScope, retrievedCount: number) {
    super(`No retrieved source matched the explicitly required ${scope.domain}${scope.pathPrefix || ""} provenance; ${retrievedCount} off-scope result(s) were withheld rather than presented as supporting evidence.`);
    this.name = "SourceScopeUnavailableError";
    this.scope = scope;
    this.retrievedCount = retrievedCount;
  }
}

export function restrictResultsToScope<T extends { url: string }>(results: T[], scope: SourceDomainScope | null): T[] {
  if (!scope) return results;
  const matching = results.filter((result) => citationMatchesScope(result.url, scope));
  if (!matching.length) throw new SourceScopeUnavailableError(scope, results.length);
  return matching;
}

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal, scope: SourceDomainScope | null = null): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").split(/\s+/).filter(Boolean).join(" ").trim().slice(0, 1_000);
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

  const raw = (await response.text()).slice(0, MAX_RSS_CHARS).trim();
  if (!raw) throw new Error("Bing RSS returned no evidence content.");

  const parsed = parseBingSearchRss(raw);
  if (!parsed.length) throw new Error("Bing RSS returned no verifiable source URLs.");
  const results = restrictResultsToScope(parsed, scope);

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
