import type { ProviderCitation } from "@/lib/providers/types";

const SEARCH_ORIGIN = "https://search.brave.com";
const MAX_SEARCH_CITATIONS = 8;
const MAX_FETCHED_SOURCES = 4;
const MAX_SOURCE_CHARS = 4_000;
const MAX_RETRIEVAL_CHARS = 14_000;

export interface BrowserRunBinding {
  quickAction(action: "links", input: { url: string; visibleLinksOnly?: boolean }): Promise<Response>;
}

const runtime = globalThis as typeof globalThis & {
  __FOREMENTION_BROWSER_RUN__?: BrowserRunBinding;
};

export function setBrowserRunBinding(binding?: BrowserRunBinding) {
  runtime.__FOREMENTION_BROWSER_RUN__ = binding;
}

export function browserRunConfigured() {
  return Boolean(runtime.__FOREMENTION_BROWSER_RUN__);
}

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
    if (url.hostname === "search.brave.com" || url.hostname.endsWith(".search.brave.com")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function linksFromPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) return payload.filter((value): value is string => typeof value === "string");
  if (payload && typeof payload === "object") {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result.filter((value): value is string => typeof value === "string");
  }
  return [];
}

export function parseBrowserSearchLinks(payload: unknown): ProviderCitation[] {
  const citations = new Map<string, ProviderCitation>();
  for (const value of linksFromPayload(payload)) {
    const url = normalizeHttpUrl(value);
    if (!url || citations.has(url)) continue;
    citations.set(url, { url, title: new URL(url).hostname.replace(/^www\./, "") });
    if (citations.size >= MAX_SEARCH_CITATIONS) break;
  }
  return Array.from(citations.values());
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

function extractTitle(html: string, fallback: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities((match?.[1] || fallback).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 240);
}

function readableText(html: string) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(?:script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg|template)>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:p|div|article|section|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  ).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

async function runWithAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  if (signal.aborted) throw new DOMException("The retrieval request timed out.", "AbortError");
  return await Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("The retrieval request timed out.", "AbortError")), { once: true });
    }),
  ]);
}

async function fetchSource(citation: ProviderCitation, signal?: AbortSignal) {
  try {
    const response = await fetch(citation.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        "user-agent": "Foremention/1.0 evidence-retrieval",
      },
      signal,
    });
    if (!response.ok) return null;
    const finalUrl = normalizeHttpUrl(response.url || citation.url);
    if (!finalUrl) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/.test(contentType)) return null;
    const raw = (await response.text()).slice(0, 160_000);
    const text = readableText(raw).slice(0, MAX_SOURCE_CHARS);
    if (text.length < 160) return null;
    return {
      citation: { url: finalUrl, title: extractTitle(raw, citation.title || new URL(finalUrl).hostname) },
      text,
    };
  } catch {
    return null;
  }
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "cloudflare-browser-search";
};

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const browser = runtime.__FOREMENTION_BROWSER_RUN__;
  if (!browser) throw new Error("Cloudflare Browser Run is not configured for free web retrieval.");

  const searchUrl = `${SEARCH_ORIGIN}/search?q=${encodeURIComponent(normalized)}&source=web`;
  const response = await runWithAbort(browser.quickAction("links", { url: searchUrl, visibleLinksOnly: true }), signal);
  if (!response.ok) throw new Error(`Cloudflare Browser Run search failed with HTTP ${response.status}.`);

  const payload = await response.json().catch(() => null);
  const discovered = parseBrowserSearchLinks(payload);
  if (!discovered.length) throw new Error("Cloudflare Browser Run search returned no verifiable public source URLs.");

  const fetched = (await Promise.all(discovered.slice(0, MAX_FETCHED_SOURCES).map((citation) => fetchSource(citation, signal))))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!fetched.length) throw new Error("Search found public URLs, but none returned usable source content.");

  const citations = fetched.map((item) => item.citation);
  const content = fetched
    .map((item, index) => `SOURCE [${index + 1}]\nTitle: ${item.citation.title || new URL(item.citation.url).hostname}\nURL: ${item.citation.url}\n${item.text}`)
    .join("\n\n")
    .slice(0, MAX_RETRIEVAL_CHARS);

  return { content, citations, retrievalProvider: "cloudflare-browser-search" };
}
