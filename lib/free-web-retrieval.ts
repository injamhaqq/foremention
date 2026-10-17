import type { ProviderCitation } from "@/lib/providers/types";
import {
  citationMatchesScope as sharedCitationMatchesScope,
  sourceDomainScopeFromPrompt as sharedSourceDomainScopeFromPrompt,
} from "./official-source-relevance.mjs";
import { assessRetrievedTopicRelevance, RetrievedTopicUnavailableError } from "./retrieval-topic-relevance.mjs";

const BING_SEARCH_ENDPOINT = "https://www.bing.com/search";
// A07: Bing RSS output is licensed for personal, non-commercial use only. When a
// commercially licensed Brave Search API key is configured, Brave is used exclusively
// and Bing RSS is never called.
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const MAX_RSS_CHARS = 256_000;
const MAX_RETRIEVAL_CHARS = 12_000;
const MAX_CITATIONS = 8;
// #345/A08: when a request explicitly scopes evidence to one official domain,
// read deeper into the result list before filtering so an in-scope result that
// ranks after eight off-domain hits is not silently discarded. Only in-scope
// results survive, and at most MAX_CITATIONS of them reach the model.
const MAX_SCOPED_CANDIDATES = 20;
// Retrieve enough ranked candidates for topical screening before choosing the
// 8 allowed model-facing citations. A page at rank 9–20 may be the first
// question-relevant hit. This does not add a second search API request.
const MAX_TOPICAL_CANDIDATES = 20;

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

export function parseBingSearchRss(input: string, limit: number = MAX_CITATIONS): BingSearchResult[] {
  const raw = input.slice(0, MAX_RSS_CHARS);
  const lower = raw.toLowerCase();
  const results = new Map<string, BingSearchResult>();
  let cursor = 0;

  while (cursor < raw.length && results.size < limit) {
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
  retrievalProvider: "brave-search" | "bing-rss";
  retrievalQuery: string;
  retrievedCandidateCount: number;
  relevanceRejectedCount: number;
  /** True only when the exact page named by a path-scoped request was read and its metadata attached. */
  scopedPageRead?: boolean;
};

/**
 * Explicit source-domain requirement extracted from a buyer question (#345).
 * The policy (detection, strict URL matching, answer qualification) lives in
 * lib/official-source-relevance.mjs so retrieval, the review API and the
 * production canary all enforce exactly the same rule.
 */
export type SourceDomainScope = {
  domain: string;
  pathPrefix: string | null;
};

export function sourceDomainScopeFromPrompt(prompt: string): SourceDomainScope | null {
  return sharedSourceDomainScopeFromPrompt(prompt);
}

export function citationMatchesScope(url: string, scope: SourceDomainScope) {
  return sharedCitationMatchesScope(url, scope);
}

const DOMAIN_PATTERN = /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|ai|co|dev|app|gov|edu|info|news|blog|tech|cloud|so|xyz|us|uk|de|fr|in|bd))(\/[a-z0-9\-._~/%]*)?/gi;
const QUERY_STOPWORDS = new Set([
  "a", "about", "according", "after", "an", "and", "answer", "answering", "are", "as", "at", "be", "by", "can", "cannot",
  "cite", "current", "date", "did", "do", "does", "evidence", "exact", "for", "from", "has", "have", "how", "i", "if", "in",
  "is", "it", "its", "memory", "most", "now", "of", "official", "on", "or", "rather", "recent", "recently", "say", "search",
  "site", "so", "source", "than", "that", "the", "their", "this", "time", "to", "url", "use", "used", "verify", "was", "web",
  "website", "what", "when", "which", "with", "you", "your",
]);

/** Concise, bounded, domain-qualified retrieval query (documented normalization). */
/**
 * A path names one specific page only when it has at least two segments
 * ("/news/claude-3-family", "/index/chatgpt"). A single segment ("/news") is a
 * section, used for "newest post" questions: never read or slug-searched.
 */
function namedPageSlug(scope: SourceDomainScope | null): string {
  const segments = (scope?.pathPrefix || "").toLowerCase().split("/").filter(Boolean);
  return segments.length >= 2 ? segments[segments.length - 1] : "";
}

export function domainScopedQuery(prompt: string, scope: SourceDomainScope) {
  const withoutDomains = prompt.normalize("NFKC").toLowerCase().replace(DOMAIN_PATTERN, " ");
  const keywords: string[] = [];
  // Chat 01: the named page's own slug is the strongest signal for search
  // engines, which ignore the path part of a site: operator.
  for (const token of namedPageSlug(scope).split(/[^a-z0-9]+/)) {
    if (!token || QUERY_STOPWORDS.has(token) || keywords.includes(token)) continue;
    keywords.push(token);
    if (keywords.length >= 5) break;
  }
  for (const token of withoutDomains.split(/[^a-z0-9]+/)) {
    if (token.length < 3 || QUERY_STOPWORDS.has(token) || keywords.includes(token)) continue;
    keywords.push(token);
    if (keywords.length >= 8) break;
  }
  const site = `site:${scope.domain}${scope.pathPrefix || ""}`;
  return [site, ...keywords].join(" ").slice(0, 200).trim();
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

type BraveWebResult = { url?: unknown; title?: unknown; description?: unknown; extra_snippets?: unknown };

export function parseBraveSearchResponse(payload: unknown, limit: number = MAX_CITATIONS): BingSearchResult[] {
  const web = (payload as { web?: { results?: unknown } } | null)?.web;
  const list = Array.isArray(web?.results) ? (web!.results as BraveWebResult[]) : [];
  const results = new Map<string, BingSearchResult>();
  for (const item of list) {
    if (results.size >= limit) break;
    const url = typeof item.url === "string" ? normalizeHttpUrl(item.url) : null;
    if (!url || results.has(url)) continue;
    const title = typeof item.title === "string" ? textFromXml(item.title).slice(0, 240) : "";
    const extras = Array.isArray(item.extra_snippets) ? item.extra_snippets.filter((v): v is string => typeof v === "string") : [];
    const description = typeof item.description === "string" ? item.description : "";
    const snippet = textFromXml([description, ...extras].join(" ")).slice(0, 1_200);
    results.set(url, { url, title: title || undefined, snippet });
  }
  return Array.from(results.values());
}

export function braveSearchApiKey(): string | null {
  const key = typeof process !== "undefined" ? process.env.BRAVE_SEARCH_API_KEY : undefined;
  return key && key.trim() ? key.trim() : null;
}

/**
 * A07/CV-02: Bing's public RSS endpoint has no verified commercial retrieval
 * grant in this repository. No credential/Brave capacity does NOT authorize a
 * silent fallback to RSS. Explicit operator rights approval is required.
 */
export class RetrievalRightsUnavailableError extends Error {
  constructor() {
    super("Independent web retrieval is unavailable: no commercial Brave Search credential or explicit approved Bing RSS collection authorization is configured.");
    this.name = "RetrievalRightsUnavailableError";
  }
}

export function assertAuthorizedIndependentRetrieval(): "brave-search" | "bing-rss" {
  if (braveSearchApiKey()) return "brave-search";
  if (process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED === "1") return "bing-rss";
  throw new RetrievalRightsUnavailableError();
}

async function retrieveBraveResults(query: string, apiKey: string, limit: number, signal?: AbortSignal) {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", query.slice(0, 400));
  url.searchParams.set("count", String(limit));
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("extra_snippets", "true");
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", "x-subscription-token": apiKey },
    signal,
  });
  if (!response.ok) throw new Error(`Brave Search retrieval failed with HTTP ${response.status}.`);
  return parseBraveSearchResponse(await response.json(), limit);
}


// Chat 01: search snippets rarely carry an article's own title/date, so a
// path-scoped official request ("on example.com/news/x, what is the title and
// publication date?") was answerable only from memory, and the model rightly
// abstained. For that one exact in-scope page we read the page itself, once,
// and attach ONLY machine-readable facts the publisher states (title and
// published-date metadata) plus a short description. Bounded: https only, the
// exact host+path the buyer named and search returned, same-scope redirects
// only, 8s, 600 KB, HTML only. Any failure attaches nothing (snippet-only
// evidence stays, and an honest "cannot verify" remains the correct answer).
const SCOPED_PAGE_MAX_BYTES = 600_000;
const SCOPED_PAGE_TIMEOUT_MS = 8_000;

export type ScopedPageFacts = { title: string | null; published: string | null; description: string | null };

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*content=["']([^"']{1,400})["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]*(?:property|name|itemprop)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeXml(match[1]).trim() || null;
  }
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+\-Z]*)?$/;

export function extractScopedPageFacts(html: string): ScopedPageFacts {
  const head = html.slice(0, SCOPED_PAGE_MAX_BYTES);
  const titleTag = head.match(/<title[^>]*>([^<]{1,400})<\/title>/i);
  const title = metaContent(head, "og:title") || (titleTag ? decodeXml(titleTag[1]).trim() : null);
  let published = metaContent(head, "article:published_time") || metaContent(head, "datePublished");
  if (!published) {
    const ld = head.match(/"datePublished"\s*:\s*"([^"]{8,40})"/);
    if (ld) published = ld[1];
  }
  if (!published) {
    const time = head.match(/<time[^>]+datetime=["']([^"']{8,40})["']/i);
    if (time) published = time[1];
  }
  if (published && !ISO_DATE.test(published.trim())) published = null;
  const description = metaContent(head, "og:description") || metaContent(head, "description");
  return {
    title: title ? title.slice(0, 240) : null,
    published: published ? published.trim() : null,
    description: description ? description.slice(0, 400) : null,
  };
}

function exactScopedPage(url: string, scope: SourceDomainScope) {
  if (!scope.pathPrefix || !namedPageSlug(scope)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password) return false;
    return parsed.hostname.replace(/^www\./, "").toLowerCase() === scope.domain
      && parsed.pathname.replace(/\/+$/, "").toLowerCase() === scope.pathPrefix;
  } catch {
    return false;
  }
}

export async function readScopedOfficialPage(url: string, scope: SourceDomainScope, signal?: AbortSignal): Promise<ScopedPageFacts | null> {
  if (!exactScopedPage(url, scope)) return null;
  const timeout = AbortSignal.timeout(SCOPED_PAGE_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { accept: "text/html,application/xhtml+xml;q=0.9", "user-agent": "Foremention/1.0 evidence-retrieval" },
      signal: combined,
    });
    if (!response.ok || !citationMatchesScope(response.url || url, scope)) return null;
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") || "")) return null;
    const length = Number(response.headers.get("content-length") || 0);
    if (length > SCOPED_PAGE_MAX_BYTES * 4) return null;
    const html = (await response.text()).slice(0, SCOPED_PAGE_MAX_BYTES);
    const facts = extractScopedPageFacts(html);
    return facts.title || facts.published ? facts : null;
  } catch {
    if (signal?.aborted) throw signal.reason ?? new Error("Evidence retrieval was aborted.");
    return null;
  }
}

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal, scope: SourceDomainScope | null = null): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").split(/\s+/).filter(Boolean).join(" ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const candidateLimit = scope ? MAX_SCOPED_CANDIDATES : MAX_TOPICAL_CANDIDATES;
  // Fail closed even when a caller bypasses Cloudflare's outer preflight.
  assertAuthorizedIndependentRetrieval();
  const braveKey = braveSearchApiKey();
  let parsed: BingSearchResult[];
  let retrievalProvider: FreeWebEvidence["retrievalProvider"];
  if (braveKey) {
    parsed = await retrieveBraveResults(normalized, braveKey, candidateLimit, signal);
    retrievalProvider = "brave-search";
  } else {
    const url = new URL(BING_SEARCH_ENDPOINT);
    url.searchParams.set("format", "rss");
    url.searchParams.set("q", normalized);
    url.searchParams.set("count", String(candidateLimit));
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
    parsed = raw ? parseBingSearchRss(raw, candidateLimit) : [];
    retrievalProvider = "bing-rss";
  }
  // An explicit official-domain request with no in-scope result is
  // "evidence unavailable" (unknown), for both providers, never a generic
  // retryable failure and never off-domain substitutes.
  // Chat 01: the buyer named one exact official page. Search engines ignore
  // the path in site: operators, so the page is read directly (bounded, see
  // readScopedOfficialPage) and stands as its own source when search missed it.
  const namedPageUrl = scope && namedPageSlug(scope) ? `https://${scope.domain}${scope.pathPrefix}` : null;
  const namedPageFacts = namedPageUrl && scope ? await readScopedOfficialPage(namedPageUrl, scope, signal) : null;
  if (namedPageUrl && namedPageFacts && !parsed.some((result) => scope && exactScopedPage(result.url, scope))) {
    parsed.unshift({ url: namedPageUrl, title: namedPageFacts.title || undefined, snippet: namedPageFacts.description || "" });
  }
  if (!parsed.length) {
    if (scope) throw new SourceScopeUnavailableError(scope, 0);
    throw new Error(retrievalProvider === "brave-search"
      ? "Brave Search returned no verifiable source URLs."
      : "Bing RSS returned no verifiable source URLs.");
  }
  const scopedResults = restrictResultsToScope(parsed, scope);
  // A08/CV-01: topical relevance is checked BEFORE inference and citation
  // selection. Explicit official-domain requests already have a separate
  // strict provenance gate and may legitimately ask for the newest post,
  // whose title cannot be predicted from the question.
  const topical = scope ? null : assessRetrievedTopicRelevance(normalized, scopedResults);
  if (topical && !topical.accepted.length) {
    throw new RetrievedTopicUnavailableError(topical.reason || "NO_TOPICALLY_RELEVANT_RESULTS", scopedResults.length);
  }
  const results = (topical ? topical.accepted : scopedResults).slice(0, MAX_CITATIONS);

  const pageTarget = scope?.pathPrefix ? results.find((result) => exactScopedPage(result.url, scope)) : undefined;
  const pageFacts = pageTarget ? namedPageFacts : null;

  const evidenceText = results.map((result, index) => [
    `SOURCE [${index + 1}]`,
    `Title: ${result.title || new URL(result.url).hostname}`,
    `URL: ${result.url}`,
    result.snippet ? `Snippet: ${result.snippet}` : "",
    result === pageTarget && pageFacts ? [
      "Publisher page metadata (read directly from this exact URL):",
      pageFacts.title ? `Page title: ${pageFacts.title}` : "",
      pageFacts.published ? `Page publication timestamp (ISO 8601, as published): ${pageFacts.published}` : "",
      pageFacts.description ? `Page description: ${pageFacts.description}` : "",
    ].filter(Boolean).join("\n") : "",
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, MAX_RETRIEVAL_CHARS);

  return {
    content: evidenceText,
    citations: results.map(({ url: sourceUrl, title }) => ({ url: sourceUrl, title })),
    retrievalProvider,
    retrievalQuery: normalized,
    retrievedCandidateCount: parsed.length,
    relevanceRejectedCount: topical?.rejected.length || 0,
    scopedPageRead: Boolean(pageFacts),
  };
}
