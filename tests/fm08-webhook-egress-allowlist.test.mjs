import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  approvedWorkspaceWebhookOrigins,
  assertApprovedWorkspaceWebhookDestination,
  workspaceWebhookDeliveryEnabled,
} from "../lib/webhook-egress-policy.ts";

const saved = process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS;
function withOrigins(origins, fn) {
  if (origins === undefined) delete process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS;
  else process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS = origins;
  try { return fn(); }
  finally {
    if (saved === undefined) delete process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS;
    else process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS = saved;
  }
}

test("workspace webhook egress is disabled unless an operator approves an origin", () => {
  withOrigins(undefined, () => {
    assert.equal(workspaceWebhookDeliveryEnabled(), false);
    assert.throws(() => assertApprovedWorkspaceWebhookDestination("https://hooks.example.com/delivery"), /not enabled/);
  });
  withOrigins("", () => assert.equal(workspaceWebhookDeliveryEnabled(), false));
});

test("only exact configured HTTPS origins can receive workspace webhook deliveries", () => {
  withOrigins("https://hooks.example.com, https://other.example.com/", () => {
    assert.deepEqual([...approvedWorkspaceWebhookOrigins()], ["https://hooks.example.com", "https://other.example.com"]);
    assert.equal(workspaceWebhookDeliveryEnabled(), true);
    assert.equal(assertApprovedWorkspaceWebhookDestination("https://hooks.example.com/delivery?q=1"), "https://hooks.example.com/delivery?q=1");
    assert.equal(assertApprovedWorkspaceWebhookDestination("https://other.example.com/events"), "https://other.example.com/events");
    for (const unapproved of [
      "https://sub.hooks.example.com/accept",
      "https://hooks.example.com.attacker.example/accept",
      "https://attacker.example/accept",
      "http://hooks.example.com/accept",
      "https://hooks.example.com:8443/accept",
      "https://admin:pw@hooks.example.com/accept",
      "https://127.0.0.1/accept",
      "https://169.254.169.254/latest/meta-data",
    ]) assert.throws(() => assertApprovedWorkspaceWebhookDestination(unapproved), /not enabled|inspect|source|ports/i, unapproved);
  });
});

test("a malformed or nonpublic entry invalidates the entire operator allowlist", () => {
  for (const configured of [
    "https://hooks.example.com,*",
    "https://hooks.example.com,https://localhost",
    "https://hooks.example.com,http://other.example.com",
    "https://hooks.example.com,https://other.example.com/secret",
    "https://hooks.example.com,https://u:p@other.example.com",
    "https://hooks.example.com,https://other.example.com?token=1",
    "https://hooks.example.com,",
  ]) withOrigins(configured, () => {
    assert.equal(workspaceWebhookDeliveryEnabled(), false, configured);
    assert.throws(() => assertApprovedWorkspaceWebhookDestination("https://hooks.example.com/endpoint"), /not enabled/);
  });
});

test("creation and dispatch independently check the allowlist before DB insert and network fetch", async () => {
  const root = new URL("../", import.meta.url);
  const [route, delivery, example] = await Promise.all([
    readFile(new URL("app/api/webhooks/route.ts", root), "utf8"),
    readFile(new URL("lib/workspace-webhooks.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  const registrationGuard = route.indexOf("assertApprovedWorkspaceWebhookDestination(validateWebhookDestination");
  const registrationWrite = route.indexOf('supabaseRest("workspace_webhook_endpoints"');
  assert.ok(registrationGuard >= 0 && registrationGuard < registrationWrite);
  const dispatchGuard = delivery.indexOf("assertApprovedWorkspaceWebhookDestination(validateWebhookDestination");
  const dispatchFetch = delivery.indexOf("await fetch(destination");
  assert.ok(dispatchGuard >= 0 && dispatchGuard < dispatchFetch);
  assert.match(delivery, /!workspaceWebhookDeliveryEnabled\(\)/);
  assert.match(example, /^WORKSPACE_WEBHOOK_ALLOWED_ORIGINS=/m);
  assert.match(delivery, /redirect: "error"/);
});
