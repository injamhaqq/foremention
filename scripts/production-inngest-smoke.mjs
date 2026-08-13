const baseUrl = String(process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, "");
const expectedBuild = String(process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();
const waitSeconds = Number(process.env.FOREMENTION_INNGEST_WAIT_SECONDS || "90");

if (!/^[0-9a-f]{40}$/.test(expectedBuild)) throw new Error("FOREMENTION_EXPECTED_BUILD_COMMIT must be the exact 40-character Git SHA.");
if (!Number.isFinite(waitSeconds) || waitSeconds < 1 || waitSeconds > 300) throw new Error("FOREMENTION_INNGEST_WAIT_SECONDS must be between 1 and 300 seconds.");

const endpoint = `${baseUrl}/api/ops/inngest-probe`;

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return {}; }
}

function assertBuild(payload) {
  if (payload.buildCommit !== expectedBuild) {
    throw new Error(`Runtime probe resolved ${payload.buildCommit || "no build"}; expected ${expectedBuild}.`);
  }
}

const dispatched = await fetch(endpoint, {
  method: "POST",
  headers: { accept: "application/json" },
  redirect: "error",
  signal: AbortSignal.timeout(10_000),
});
const dispatchedPayload = await readJson(dispatched);
if (!dispatched.ok) throw new Error(`Runtime probe dispatch failed with HTTP ${dispatched.status}: ${dispatchedPayload.error || "unknown error"}`);
assertBuild(dispatchedPayload);

if (dispatchedPayload.status === "executed") {
  console.log(`Inngest runtime probe already executed for ${expectedBuild}.`);
  process.exit(0);
}

const deadline = Date.now() + waitSeconds * 1_000;
let lastStatus = dispatchedPayload.status || "pending";
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    lastStatus = `http_${response.status}`;
    continue;
  }
  assertBuild(payload);
  lastStatus = payload.status || "unknown";
  if (payload.status === "executed") {
    console.log(`Inngest runtime probe executed for ${expectedBuild}${payload.executedAt ? ` at ${payload.executedAt}` : ""}.`);
    process.exit(0);
  }
}

throw new Error(`Inngest accepted the production runtime probe but did not produce durable execution evidence within ${waitSeconds}s (last status: ${lastStatus}).`);
