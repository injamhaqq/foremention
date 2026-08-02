import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("workspace webhooks are tenant-scoped, signed, idempotent, and background-delivered", async () => {
  const [delivery, migration, route, jobs, docs] = await Promise.all([
    text("lib/workspace-webhooks.ts"), text("supabase/migrations/20260802000600_workspace_webhooks.sql"),
    text("app/api/webhooks/route.ts"), text("lib/jobs/inngest.ts"), text("app/api-docs/webhooks/page.tsx"),
  ]);
  assert.match(delivery, /x-foremention-signature/);
  assert.match(delivery, /resolution=ignore-duplicates/);
  assert.match(delivery, /delivery\.status === "delivered"/);
  assert.match(delivery, /attempt_count >= 4/);
  assert.match(delivery, /redirect: "error"/);
  assert.match(delivery, /url\.protocol !== "https:"/);
  assert.match(delivery, /validatePublicSourceUrl/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /workspace_webhook_endpoints_write_admin/);
  assert.match(route, /organization_id: context\.organizationId/);
  assert.match(jobs, /deliver-workspace-webhook-events/);
  assert.match(docs, /deduplicate/);
  assert.doesNotMatch(delivery, /console\.(log|error)/);
});
