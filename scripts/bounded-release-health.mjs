// Pure, bounded release-health classifier. Only fixed status codes and an exact
// build SHA are surfaced to browser acceptance; never log response bodies.
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const COMPONENT_STATES = new Set(["reachable", "unavailable", "not_configured"]);
const validSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);

export function classifyHealthObservation(status, buildCommit, expectedBuildCommit) {
  if (!validSha(expectedBuildCommit)) return { action: "fail", reason: "invalid_expected_sha" };
  const observed = typeof buildCommit === "string" ? buildCommit.trim().toLowerCase() : "";
  // Never accept a different deployed release, even if the dependency is transiently degraded.
  if (validSha(observed) && observed !== expectedBuildCommit) return { action: "fail", reason: "wrong_sha" };
  if (status === 200 && observed === expectedBuildCommit) return { action: "pass", reason: null };
  if (RETRYABLE_STATUSES.has(status)) return { action: "retry", reason: "transient_health" };
  return { action: "fail", reason: status === 200 ? "missing_build_sha" : "unexpected_health_status" };
}

/**
 * A 503 may be a bounded dependency health probe timeout rather than a page
 * regression. Require eventual exact-SHA 200 inside this small window; fail
 * on persistent degradation, wrong SHA and all other statuses.
 */
export async function verifyBoundedReleaseHealth({ expectedBuildCommit, request, pause = () => Promise.resolve(), maxAttempts = MAX_ATTEMPTS }) {
  const receipts = [];
  const attempts = Math.max(1, Math.min(MAX_ATTEMPTS, Number.isInteger(maxAttempts) ? maxAttempts : MAX_ATTEMPTS));
  for (let index = 0; index < attempts; index += 1) {
    let status = 0;
    let buildCommit = null;
    let d1 = null;
    let supabase = null;
    try {
      const response = await request();
      status = Number.isInteger(response?.status) ? response.status : 0;
      buildCommit = typeof response?.buildCommit === "string" ? response.buildCommit.trim().toLowerCase() : null;
      // Public health endpoint exposes these finite values; never store raw error messages.
      d1 = COMPONENT_STATES.has(response?.d1) ? response.d1 : null;
      supabase = COMPONENT_STATES.has(response?.supabase) ? response.supabase : null;
    } catch {
      // No exception string or request URL can reach the operational receipt.
    }
    const decision = classifyHealthObservation(status, buildCommit, expectedBuildCommit);
    receipts.push({ status, buildCommit: validSha(buildCommit) ? buildCommit : null, d1, supabase });
    if (decision.action === "pass") return { ok: true, reason: null, receipts };
    if (decision.action !== "retry" || index === attempts - 1) return { ok: false, reason: decision.reason, receipts };
    await pause();
  }
  return { ok: false, reason: "no_attempts", receipts };
}
