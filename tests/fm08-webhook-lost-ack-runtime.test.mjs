import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/workspace-webhooks.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  fileName: "workspace-webhooks.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: false,
  },
}).outputText;

function loadIsolatedSender({ enabled = true, supabaseRest, fetch }) {
  const exports = {};
  const dependencies = {
    "@/lib/collection-policy": {
      safeOperationalError: () => "synthetic_delivery_error",
    },
    "@/lib/source-inspection": {
      validatePublicSourceUrl: (value) => new URL(value),
      assertPublicSourceResolution: async () => {},
    },
    "@/lib/webhook-egress-policy": {
      assertApprovedWorkspaceWebhookDestination: (value) => value,
      workspaceWebhookDeliveryEnabled: () => enabled,
    },
    "@/lib/supabase-rest": {
      supabaseRest,
    },
  };
  const require = (id) => {
    if (!(id in dependencies)) throw new Error("Unexpected module import: " + id);
    return dependencies[id];
  };
  runInNewContext(compiled, {
    exports,
    require,
    crypto: webcrypto,
    TextEncoder,
    btoa,
    AbortSignal,
    URL,
    fetch,
    process: {
      env: {
        WEBHOOK_SIGNING_SECRET: "f".repeat(48),
        WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED: enabled ? "1" : "0",
      },
    },
  }, { filename: "workspace-webhooks.synthetic.cjs" });
  return exports.deliverWorkspaceWebhooks;
}

const event = Object.freeze({
  organizationId: "org-synthetic",
  projectId: "project-synthetic",
  eventKey: "synthetic-occurred-once",
  eventType: "collection.completed",
  occurredAt: "2026-10-10T00:00:00.000Z",
  href: "/app/records/synthetic",
});

test("workspace webhook delivery remains completely disabled without approved migration flag", async () => {
  const deliver = loadIsolatedSender({
    enabled: false,
    supabaseRest: async () => { throw new Error("Unexpected database call when disabled"); },
    fetch: async () => { throw new Error("Unexpected HTTP call when disabled"); },
  });
  const result = await deliver(event);
  assert.equal(result.status, "not_configured");
  assert.equal(result.delivered, 0);
  assert.equal(result.failed, 0);
});

test("lost database ACK yields deferred lease, stable event ID and receiver-safe replay", async () => {
  let mode = "new";
  const receivedIds = new Set();
  const claims = [];
  const settlements = [];
  let httpPosts = 0;
  let duplicateEvents = 0;

  const rest = async (path, options) => {
    if (path.startsWith("projects?")) return [{ id: event.projectId }];
    if (path.startsWith("workspace_webhook_endpoints?")) {
      return [{
        id: "endpoint-synthetic",
        organization_id: event.organizationId,
        destination_url: "https://example.invalid/receiver",
        event_types: [event.eventType],
        active: true,
      }];
    }
    if (path === "rpc/claim_workspace_webhook_delivery") {
      assert.equal(options.serviceRole, true);
      assert.equal(options.body.p_event_key, event.eventKey);
      claims.push(mode);
      if (mode === "new") {
        mode = "leased";
        return { state: "claimed", delivery_id: "receipt-1", attempt_count: 1 };
      }
      if (mode === "leased") return { state: "leased" };
      if (mode === "expired") {
        mode = "second-attempt";
        return { state: "claimed", delivery_id: "receipt-1", attempt_count: 2 };
      }
      if (mode === "complete") return null;
      throw new Error("Unexpected claim state: " + mode);
    }
    if (path === "rpc/settle_workspace_webhook_delivery") {
      assert.equal(options.serviceRole, true);
      settlements.push(options.body);
      assert.equal(options.body.p_delivery_id, "receipt-1");
      if (options.body.p_status !== "delivered") {
        throw new Error("A successful external POST must never be rewritten as failure");
      }
      if (options.body.p_attempt_count === 1) {
        // The receiver already accepted the event, but DB ACK is lost.
        throw new Error("Synthetic settlement transport lost acknowledgement");
      }
      assert.equal(options.body.p_attempt_count, 2);
      mode = "complete";
      return true;
    }
    throw new Error("Unexpected database resource: " + path);
  };
  const fetch = async (destination, request) => {
    assert.equal(destination, "https://example.invalid/receiver");
    assert.equal(request.method, "POST");
    assert.equal(request.redirect, "error");
    assert.ok(request.headers["x-foremention-signature"].startsWith("v1="));
    const sent = JSON.parse(request.body);
    assert.equal(sent.id, event.eventKey);
    httpPosts += 1;
    if (receivedIds.has(sent.id)) duplicateEvents += 1;
    else receivedIds.add(sent.id);
    return { ok: true, status: 204 };
  };

  const deliver = loadIsolatedSender({ supabaseRest: rest, fetch });
  await assert.rejects(
    () => deliver(event),
    /One or more workspace webhook deliveries failed and may be retried/,
  );
  assert.equal(httpPosts, 1);
  assert.equal(mode, "leased");
  assert.equal(settlements.length, 1);
  assert.equal(settlements[0].p_status, "delivered");

  // Same event is still leased; it must not POST again until lease expiry.
  const deferred = await deliver(event);
  assert.equal(deferred.status, "deferred");
  assert.equal(httpPosts, 1);

  // Simulate expiry in the fake claim RPC; actual PG lease tested separately.
  mode = "expired";
  const settled = await deliver(event);
  assert.equal(settled.status, "processed");
  assert.equal(settled.delivered, 1);
  assert.equal(httpPosts, 2);
  assert.equal(duplicateEvents, 1);
  assert.equal(receivedIds.size, 1);
  assert.deepEqual(claims, ["new", "leased", "expired"]);
  assert.deepEqual(settlements.map((row) => row.p_attempt_count), [1, 2]);
  assert.deepEqual(settlements.map((row) => row.p_status), ["delivered", "delivered"]);
});
