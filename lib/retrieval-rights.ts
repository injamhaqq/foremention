export const BING_RSS_COMMERCIAL_RIGHTS_ENV = "FOREMENTION_BING_RSS_COMMERCIAL_RIGHTS_CONFIRMED" as const;

/**
 * Public Bing Search RSS is not treated as commercially permitted merely
 * because it is reachable. Customer/public evidence retrieval stays disabled
 * until an operator has separately confirmed that the exact current use,
 * retention and display terms are applicable.
 *
 * Keep this server-only. Never mirror the value into NEXT_PUBLIC_*.
 */
export function bingRssCommercialRightsConfirmed(
  env: Record<string, string | undefined> = process.env,
) {
  return env[BING_RSS_COMMERCIAL_RIGHTS_ENV]?.trim() === "1";
}
