// Fix track "ux" (2026-10-19): simpler signed-in navigation.
//
// The eight primary destinations are locked (CLAUDE.md). Previously only an
// exact prefix match marked a destination as current, so most specialist
// pages (Alerts, Evidence Vault, Team, Support, Competitors, ...) highlighted
// nothing and visitors lost their place. Every in-app path now maps to exactly
// one primary destination: the area it belongs to, or "All tools" for
// specialist tools that are indexed from /app/tools.

export const PRIMARY_WORKSPACE_DESTINATIONS = [
  "/app",
  "/app/prompts",
  "/app/runs",
  "/app/source-map",
  "/app/opportunities",
  "/app/analytics",
  "/app/tools",
  "/app/settings",
] as const;

export type PrimaryWorkspaceDestination = (typeof PRIMARY_WORKSPACE_DESTINATIONS)[number];

// Longest prefix wins. Paths are matched on whole segments.
const SECTION_PREFIXES: Array<[string, PrimaryWorkspaceDestination]> = [
  ["/app/onboarding", "/app"],
  ["/app/prompts", "/app/prompts"],
  ["/app/runs", "/app/runs"],
  ["/app/change-specifications", "/app/runs"],
  ["/app/source-map", "/app/source-map"],
  ["/app/sources", "/app/source-map"],
  ["/app/evidence", "/app/source-map"],
  ["/app/opportunities", "/app/opportunities"],
  ["/app/placements", "/app/opportunities"],
  ["/app/resolutions", "/app/opportunities"],
  ["/app/analytics", "/app/analytics"],
  // Outcome, weekly-intelligence and decision-analysis tools sit behind Comparisons.
  ["/app/outcomes", "/app/analytics"],
  ["/app/intelligence", "/app/analytics"],
  ["/app/decision-lab", "/app/analytics"],
  ["/app/settings", "/app/settings"],
  ["/app/team", "/app/settings"],
  ["/app/support", "/app/settings"],
  ["/app/tools", "/app/tools"],
  ["/app/search", "/app/tools"],
];

function matchesSegment(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The single primary destination that should read as current for a path. */
export function primaryDestinationForPath(pathname: string | null | undefined): PrimaryWorkspaceDestination | null {
  if (typeof pathname !== "string") return null;
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (path === "/app") return "/app";
  if (!matchesSegment(path, "/app")) return null;
  let best: [string, PrimaryWorkspaceDestination] | null = null;
  for (const entry of SECTION_PREFIXES) {
    if (matchesSegment(path, entry[0]) && (!best || entry[0].length > best[0].length)) best = entry;
  }
  // Any other signed-in page is a specialist tool listed in All tools.
  return best ? best[1] : "/app/tools";
}
