const BASE_URL = String(process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, "");
const HEALTH_ENDPOINT = `${BASE_URL}/api/health`;
const SHADOW_ENDPOINT = `${BASE_URL}/api/ops/acquisition-shadow`;
const OIDC_AUDIENCE = "foremention-acquisition-shadow";
const TERMINAL_STATUSES = new Set(["disabled", "provider_unavailable", "schema_unavailable", "shadow_drafted", "failed"]);
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 300_000;
const OIDC_REFRESH_MS = 120_000;

const expectedBuild = String(process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();
const confirmation = String(process.env.ACQUISITION_SHADOW_CONFIRM || "").trim();

if (confirmation !== "RUN") throw new Error("ACQUISITION_SHADOW_CONFIRM_REQUIRED");
if (!/^[0-9a-f]{40}$/.test(expectedBuild)) {
  throw new Error("FOREMENTION_EXPECTED_BUILD_COMMIT must be the exact 40-character Git SHA.");
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return {}; }
}

function boundedError(payload) {
  const value = typeof payload?.error === "string" ? payload.error : "no structured error detail";
  return value.slice(0, 500);
}

async function waitForExactProductionRelease() {
  const deadline = Date.now() + MAX_WAIT_MS;
  let lastBuild = "unavailable";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(HEALTH_ENDPOINT, {
        headers: { accept: "application/json", "user-agent": "Foremention-Acquisition-Shadow/2.0" },
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      const payload = await readJson(response);
      lastBuild = typeof payload?.buildCommit === "string" ? payload.buildCommit.toLowerCase() : "unavailable";
      if (response.ok && lastBuild === expectedBuild) return;
    } catch {
      lastBuild = "unreachable";
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`ACQUISITION_SHADOW_RELEASE_TIMEOUT: expected ${expectedBuild}, observed ${lastBuild}`);
}

async function requestOidcToken() {
  const requestUrl = String(process.env.ACTIONS_ID_TOKEN_REQUEST_URL || "").trim();
  const requestToken = String(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || "").trim();
  if (!requestUrl || !requestToken) throw new Error("GITHUB_ACTIONS_OIDC_UNAVAILABLE");
  const url = new URL(requestUrl);
  url.searchParams.set("audience", OIDC_AUDIENCE);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${requestToken}`, accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await readJson(response);
  const token = typeof payload?.value === "string" ? payload.value.trim() : "";
  if (!response.ok || !token) throw new Error(`GITHUB_ACTIONS_OIDC_HTTP_${response.status}`);
  return { token, issuedAt: Date.now() };
}

function shadowHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/json",
    "user-agent": "Foremention-Acquisition-Shadow/2.0",
  };
}

async function callShadow(method, token) {
  const response = await fetch(SHADOW_ENDPOINT, {
    method,
    headers: shadowHeaders(token),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await readJson(response);
  if (![200, 202].includes(response.status)) {
    throw new Error(`ACQUISITION_SHADOW_HTTP_${response.status}: ${boundedError(payload)}`);
  }
  return payload;
}

await waitForExactProductionRelease();
let oidc = await requestOidcToken();
let shadow = await callShadow("POST", oidc.token);

const deadline = Date.now() + MAX_WAIT_MS;
while (!TERMINAL_STATUSES.has(shadow?.status) && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  if (Date.now() - oidc.issuedAt >= OIDC_REFRESH_MS) oidc = await requestOidcToken();
  shadow = await callShadow("GET", oidc.token);
}

if (!TERMINAL_STATUSES.has(shadow?.status)) {
  throw new Error(`ACQUISITION_SHADOW_RUN_TIMEOUT: ${String(shadow?.status || "unknown")}`);
}

console.log(JSON.stringify({
  requestKey: shadow.requestKey ?? null,
  releaseSha: shadow.releaseSha ?? null,
  status: shadow.status,
  candidateCount: shadow.candidateCount ?? 0,
  persistedCount: shadow.persistedCount ?? 0,
  researchedCount: shadow.researchedCount ?? 0,
  qualifiedShadowCount: shadow.qualifiedShadowCount ?? 0,
  contactResolvedCount: shadow.contactResolvedCount ?? 0,
  draftCreatedCount: shadow.draftCreatedCount ?? 0,
  discoveryCreditsUsed: shadow.discoveryCreditsUsed ?? 0,
  researchCreditsUsed: shadow.researchCreditsUsed ?? 0,
  contactCreditsUsed: shadow.contactCreditsUsed ?? 0,
  errorCode: shadow.errorCode ?? null,
  requestedAt: shadow.requestedAt ?? null,
  startedAt: shadow.startedAt ?? null,
  completedAt: shadow.completedAt ?? null,
}, null, 2));

if (shadow.status !== "shadow_drafted") {
  throw new Error(`ACQUISITION_SHADOW_TERMINAL_${String(shadow.status).toUpperCase()}: ${String(shadow.errorCode || "no error code")}`);
}
