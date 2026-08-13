const baseUrl = String(process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, "");
const expectedBuild = String(process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();

if (!/^[0-9a-f]{40}$/.test(expectedBuild)) {
  throw new Error("FOREMENTION_EXPECTED_BUILD_COMMIT must be the exact 40-character Git SHA.");
}

// Release identity is proven independently by production-auth-smoke before this
// script runs. This PUT asks the deployed Inngest serve handler to serialize and
// register its current function configuration using its server-side signing key.
// No Inngest credential is accepted from or printed by this script.
const endpoint = `${baseUrl}/api/inngest`;
const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    accept: "application/json",
    "user-agent": `foremention-release-sync/${expectedBuild}`,
  },
  redirect: "error",
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  // Do not echo an upstream response body; it is unnecessary for the release
  // proof and could widen the operational-data surface in CI logs.
  throw new Error(`Inngest function sync failed with HTTP ${response.status}.`);
}

// Drain a bounded response without logging it. The success criterion is the
// serve handler's HTTP status; execution is proven separately by the heartbeat.
await response.text();
console.log(`Inngest function sync accepted for exact deployed release ${expectedBuild}.`);
