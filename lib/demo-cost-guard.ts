/**
 * FM-01 (capacity track): the fictional demo session must never reach an
 * endpoint that can trigger a web search (Brave) or a model call.
 *
 * Route handlers already branch on `viewer.mode === "demo"`, but that depends
 * on every handler remembering to. This guard runs in the Worker BEFORE the
 * application handler: any request that carries the demo cookie and targets a
 * cost-bearing endpoint is refused with 403, whatever else the request carries
 * (including a real session cookie, since getViewer() prefers the demo).
 * The provider layer refuses the demo pool as a final backstop
 * (lib/evidence-capacity.ts, EVIDENCE_CAPACITY_DEMO_MESSAGE).
 *
 * POST /api/runs is deliberately not listed: for a demo viewer it only returns
 * the isolated mock "demo-queued" receipt and refuses every live provider.
 */
const DEMO_COOKIE_NAME = "foremention-demo";

/** Method + exact path of every endpoint that can spend search or model capacity. */
export const DEMO_BLOCKED_COST_ENDPOINTS: ReadonlyArray<{ method: string; path: string }> = [
  { method: "POST", path: "/api/onboarding/analyze" },
  { method: "POST", path: "/api/public/score" },
  { method: "POST", path: "/api/public/prompt-check" },
  { method: "POST", path: "/api/internal/outreach/mini-audit" },
];

export const DEMO_COST_REFUSAL_MESSAGE = "The fictional demo cannot run live searches or model calls. Exit the demo and sign in to collect live evidence.";

export function hasDemoCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => {
    const [name, ...rest] = part.trim().split("=");
    return name === DEMO_COOKIE_NAME && rest.join("=").trim() !== "";
  });
}

export function isDemoBlockedCostEndpoint(method: string, pathname: string) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return DEMO_BLOCKED_COST_ENDPOINTS.some((entry) => entry.method === method.toUpperCase() && entry.path === normalized);
}

/** A 403 for a demo-cookie request to a cost-bearing endpoint, otherwise null. */
export function demoCostBearingRefusal(request: Request): Response | null {
  const url = new URL(request.url);
  if (!isDemoBlockedCostEndpoint(request.method, url.pathname)) return null;
  if (!hasDemoCookie(request.headers.get("cookie"))) return null;
  return Response.json({ error: DEMO_COST_REFUSAL_MESSAGE }, { status: 403, headers: { "cache-control": "private, no-store" } });
}
