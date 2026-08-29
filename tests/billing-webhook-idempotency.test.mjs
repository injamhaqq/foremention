import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("verified billing events are durably claimed once before entitlement mutation", async () => {
  const [route, migration] = await Promise.all([
    text("app/api/billing/webhook/route.ts"),
    text("supabase/migrations/20260829000300_billing_webhook_events.sql"),
  ]);

  assert.match(migration, /create table if not exists public\.billing_webhook_events/i);
  assert.match(migration, /primary key \(provider, event_id\)/i);
  assert.match(migration, /processed_at timestamptz/i);
  assert.match(migration, /enable row level security/i);
  assert.doesNotMatch(migration, /grant .*billing_webhook_events.*authenticated/i);

  assert.match(route, /async function claimBillingEvent/);
  assert.match(route, /billing_webhook_events\?on_conflict=provider,event_id/);
  assert.match(route, /resolution=ignore-duplicates,return=representation/);
  assert.match(route, /if \(!claimed\) return \{ duplicate: true \}/);
  assert.match(route, /await applyBillingEvent\(event, provider\);[\s\S]*await completeBillingEvent\(event, provider\);/);
  assert.match(route, /await releaseBillingEvent\(event, provider\)\.catch/);
  assert.match(route, /if \(result\.duplicate\) return NextResponse\.json\(\{ received: true, duplicate: true/);
});
