import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("webhook sender never delivers without both operator egress and atomics release gates", async () => {
  const [sender, example] = await Promise.all([
    read("lib/workspace-webhooks.ts"), read(".env.example"),
  ]);
  const gate = sender.indexOf('process.env.WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED !== "1"');
  const endpointQuery = sender.indexOf("workspace_webhook_endpoints?select");
  const send = sender.indexOf("await fetch(destination");
  assert.ok(gate > 0 && gate < endpointQuery && endpointQuery < send);
  assert.ok(sender.includes("workspaceWebhookDeliveryEnabled()"));
  assert.match(example, /WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED=0/);
});

test("webhook sender must claim before sending, and settle success with the same attempt", async () => {
  const s = await read("lib/workspace-webhooks.ts");
  const claim = s.indexOf("rpc/claim_workspace_webhook_delivery");
  const send = s.indexOf("await fetch(destination");
  const success = s.indexOf('claim, "delivered", response.status, null');
  assert.ok(claim > 0 && claim < send && success > send);
  assert.ok(s.includes("rpc/settle_workspace_webhook_delivery"));
  assert.ok(s.includes('claimResponse?.state === "leased"'));
  assert.ok(s.includes('status: "deferred" as const'));

  assert.ok(s.includes('claim, "failed", null, safeOperationalError(error)'));
  assert.ok(!s.includes("workspace_webhook_deliveries?on_conflict="));
  assert.match(s, /redirect: "error"/);
});

test("isolated SQL RPCs use explicit service-role execution grants and fenced settlement", async () => {
  const [sql, verify, ci] = await Promise.all([
    read("scripts/fm08-webhook-atomic-claims-candidate.sql"),
    read("scripts/verify-fm08-webhook-claims.sql"),
    read(".github/workflows/ci.yml"),
  ]);
  for (const marker of ["SECURITY DEFINER", "SET search_path = ''",
    "FOR UPDATE", "ON CONFLICT (endpoint_id, event_key) DO NOTHING",
    "attempt_count >= 4", "interval '90 seconds'", "REVOKE ALL",
    "FROM PUBLIC, anon, authenticated", "TO service_role",
    "d.attempt_count = p_attempt_count", "d.status = 'pending'",
    "jsonb_build_object('state', 'leased')", "jsonb_build_object('state', 'claimed'"]) {
    assert.ok(sql.includes(marker), "missing SQL boundary: " + marker);
  }
  const leasedClassification = sql.indexOf("RETURN jsonb_build_object('state', 'leased')");
  const exhaustedClassification = sql.indexOf("IF v_receipt.attempt_count >= 4 THEN");
  assert.ok(leasedClassification >= 0 && exhaustedClassification > leasedClassification,
    "active final attempt must be leased before the exhausted-attempt terminal branch");
  assert.ok(verify.includes("Stale token settlement accepted"));
  assert.ok(verify.includes("Second active claim was not blocked"));
  assert.ok(verify.includes("Cross-tenant/project/type or empty-event claim accepted"));
  assert.ok(verify.includes("ROLLBACK;"));
  assert.ok(ci.includes("scripts/fm08-webhook-atomic-claims-candidate.sql"));
  assert.ok(ci.includes("scripts/verify-fm08-webhook-claims.sql"));
});
