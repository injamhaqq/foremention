const API_BASE = "https://api.inngest.com/v2";
const APP_ID = "foremention";
const FUNCTION_ID = "discover-acquisition-targets-shadow";
const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 300_000;

const authToken = String(process.env.INNGEST_AUTH_TOKEN || "").trim();
const expectedBuild = String(process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();
const confirmation = String(process.env.ACQUISITION_SHADOW_CONFIRM || "").trim();

if (confirmation !== "RUN") {
  throw new Error("ACQUISITION_SHADOW_CONFIRM_REQUIRED");
}
if (!/^[0-9a-f]{40}$/.test(expectedBuild)) {
  throw new Error("FOREMENTION_EXPECTED_BUILD_COMMIT must be the exact 40-character Git SHA.");
}
if (!authToken) {
  throw new Error("INNGEST_AUTH_TOKEN_UNAVAILABLE: configure INNGEST_API_KEY or INNGEST_SIGNING_KEY as a repository secret.");
}

function headers() {
  return {
    authorization: `Bearer ${authToken}`,
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "Foremention-Acquisition-Shadow/1.0",
  };
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function boundedError(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  const message = errors
    .map((item) => (typeof item?.message === "string" ? item.message : ""))
    .filter(Boolean)
    .join("; ");
  return message.slice(0, 500) || "no structured error detail";
}

async function invoke() {
  const endpoint = `${API_BASE}/apps/${encodeURIComponent(APP_ID)}/functions/${encodeURIComponent(FUNCTION_ID)}/invoke`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        source: "github-actions",
        releaseSha: expectedBuild,
      },
      idempotencyKey: `foremention-shadow-${expectedBuild}`,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await readJson(response);
  if (![201, 202, 409].includes(response.status)) {
    throw new Error(`INNGEST_SHADOW_INVOKE_HTTP_${response.status}: ${boundedError(payload)}`);
  }
  const runId = typeof payload?.data?.runId === "string" ? payload.data.runId : "";
  if (!runId) throw new Error("INNGEST_SHADOW_RUN_ID_MISSING");
  return { runId, reused: response.status === 409 };
}

async function getRun(runId) {
  const response = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}?includeOutput=true`, {
    headers: headers(),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`INNGEST_SHADOW_STATUS_HTTP_${response.status}: ${boundedError(payload)}`);
  }
  const status = typeof payload?.data?.status === "string" ? payload.data.status : "UNSPECIFIED";
  return {
    status,
    output: payload?.data?.output ?? null,
    queuedAt: payload?.data?.queuedAt ?? null,
    startedAt: payload?.data?.startedAt ?? null,
    endedAt: payload?.data?.endedAt ?? null,
  };
}

const invocation = await invoke();
console.log(`Acquisition shadow run ${invocation.reused ? "reused" : "invoked"}: ${invocation.runId}`);

const deadline = Date.now() + MAX_WAIT_MS;
let last = { status: "QUEUED", output: null };
while (Date.now() < deadline) {
  last = await getRun(invocation.runId);
  if (TERMINAL_STATUSES.has(last.status)) break;
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}

if (!TERMINAL_STATUSES.has(last.status)) {
  throw new Error(`INNGEST_SHADOW_RUN_TIMEOUT: ${invocation.runId} remained ${last.status}`);
}

console.log(JSON.stringify({
  runId: invocation.runId,
  status: last.status,
  queuedAt: last.queuedAt ?? null,
  startedAt: last.startedAt ?? null,
  endedAt: last.endedAt ?? null,
  output: last.output ?? null,
}, null, 2));

if (last.status !== "COMPLETED") {
  throw new Error(`INNGEST_SHADOW_RUN_${last.status}`);
}
