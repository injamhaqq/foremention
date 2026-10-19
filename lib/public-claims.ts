/**
 * Public claims about how live evidence is collected (FM-04).
 *
 * Production retrieval uses one provider: the Brave Search API. When a
 * BRAVE_SEARCH_API_KEY is configured, lib/free-web-retrieval.ts uses Brave
 * exclusively and never calls Bing RSS. Bing RSS is only reachable behind an
 * explicit operator authorization flag that production does not set, so it is
 * never described as the current method in public copy.
 *
 * Public pages, metadata, markdown mirrors and llms.txt must use these values.
 * tests/claims-retrieval-provider.test.mjs fails if any public surface names
 * Bing as the retrieval provider again.
 */
export const LIVE_RETRIEVAL_PROVIDER = "Brave Search";
export const LIVE_MODEL_PROVIDER = "Cloudflare Workers AI";
export const LIVE_COLLECTION_SURFACE = `${LIVE_MODEL_PROVIDER} + ${LIVE_RETRIEVAL_PROVIDER}`;

/**
 * Label for one grounded observation, taken from the retrieval provider the
 * observation actually recorded rather than a fixed marketing string.
 */
export function groundedCollectionLabel(retrievalProvider: "brave-search" | "bing-rss" | string | null | undefined) {
  if (retrievalProvider === "bing-rss") return `${LIVE_MODEL_PROVIDER} + Bing Search RSS`;
  return LIVE_COLLECTION_SURFACE;
}
