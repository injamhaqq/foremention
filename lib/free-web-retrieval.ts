import type { ProviderCitation } from "@/lib/providers/types";

const JINA_SEARCH_ORIGIN = "https://s.jina.ai";
const MAX_RETRIEVAL_CHARS = 12_000;
const MAX_CITATIONS = 8;

function normalizeHttpUrl(value: string) {
  const candidate = value.trim().replace(/[),.;:]+$/, "");
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hostname === "s.jina.ai" || url.hostname === "r.jina.ai") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseJinaSearchCitations(raw: string): ProviderCitation[] {
  const citations = new Map<string, ProviderCitation>();
  let pendingTitle = "";

  for (const line of raw.split(/\r?\n/)) {
    const titleMatch = line.match(/^\s*Title:\s*(.+?)\s*$/i);
    if (titleMatch) {
      pendingTitle = titleMatch[1].trim().slice(0, 240);
      continue;
    }
    const urlMatch = line.match(/^\s*(?:URL Source|URL):\s*(https?:\/\/\S+)/i);
    if (urlMatch) {
      const url = normalizeHttpUrl(urlMatch[1]);
      if (url && !citations.has(url)) citations.set(url, { url, title: pendingTitle || undefined });
      pendingTitle = "";
    }
  }

  const markdownLinkPattern = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/g;
  for (const match of raw.matchAll(markdownLinkPattern)) {
    const url = normalizeHttpUrl(match[2]);
    if (url && !citations.has(url)) citations.set(url, { url, title: match[1].trim() || undefined });
  }

  return Array.from(citations.values()).slice(0, MAX_CITATIONS);
}

export type FreeWebEvidence = {
  content: string;
  citations: ProviderCitation[];
  retrievalProvider: "jina-search";
};

export async function retrieveFreeWebEvidence(query: string, signal?: AbortSignal): Promise<FreeWebEvidence> {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 1_000);
  if (normalized.length < 3) throw new Error("The web-evidence query is empty or too short.");

  const response = await fetch(`${JINA_SEARCH_ORIGIN}/${encodeURIComponent(normalized)}`, {
    method: "GET",
    headers: {
      accept: "text/plain",
      "user-agent": "Foremention/1.0 evidence-retrieval",
    },
    signal,
  });
  if (!response.ok) throw new Error(`Jina Search retrieval failed with HTTP ${response.status}.`);

  const raw = (await response.text()).trim();
  if (!raw) throw new Error("Jina Search returned no evidence content.");

  const citations = parseJinaSearchCitations(raw);
  if (!citations.length) throw new Error("Jina Search returned no verifiable source URLs.");

  return {
    content: raw.slice(0, MAX_RETRIEVAL_CHARS),
    citations,
    retrievalProvider: "jina-search",
  };
}
