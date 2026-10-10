import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("workspace delivery has per-tenant event-key step concurrency = 1", async () => {
  const src = await text("lib/jobs/inngest.ts");
  const start = src.indexOf("export const deliverWorkspaceWebhookEvents =");
  assert.ok(start >= 0, "delivery function must exist");
  const section = src.slice(start, src.indexOf("export const deliverHubSpotActionEvents", start));
  assert.match(section, /id: "deliver-workspace-webhook-events"/);
  assert.match(section, /triggers: \{ event: "foremention\/workspace\.event" \}/);
  assert.match(section, /concurrency: \{ limit: 1, key: 'event\.data\.organizationId \+ ":" \+ event\.data\.eventKey' \}/);
  assert.match(section, /step\.run\("deliver-signed-webhooks"/);
  assert.match(section, /deliverWorkspaceWebhooks\(event\.data as DeliveryEvent\)/);
});

test("webhook concurrency combines with atomic fenced receipt claims", async () => {
  const [delivery, sql] = await Promise.all([
    text("lib/workspace-webhooks.ts"),
    text("supabase/migrations/20260802000600_workspace_webhooks.sql"),
  ]);
  assert.match(delivery, /rpc\\/claim_workspace_webhook_delivery/);
  assert.match(sql, /unique \(endpoint_id, event_key\)/);
  assert.match(delivery, /delivery\.status === "delivered"/);
  assert.match(delivery, /redirect: "error"/);
  // Do not mutate database state or call an outbound webhook in this regression.
});
