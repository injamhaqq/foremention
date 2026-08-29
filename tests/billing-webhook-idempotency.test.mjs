import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("verified billing events are durably claimed once before atomic entitlement mutation", async () => {
  const [route, receiptMigration, atomicMigration] = await Promise.all([
    text("app/api/billing/webhook/route.ts"),
    text("supabase/migrations/20260829000300_billing_webhook_events.sql"),
    text("supabase/migrations/20260830000200_apply_billing_event_atomic.sql"),
  ]);

  assert.match(receiptMigration, /create table if not exists public\.billing_webhook_events/i);
  assert.match(receiptMigration, /primary key \(provider, event_id\)/i);
  assert.match(receiptMigration, /processed_at timestamptz/i);
  assert.match(receiptMigration, /enable row level security/i);
  assert.doesNotMatch(receiptMigration, /grant .*billing_webhook_events.*authenticated/i);

  assert.match(route, /async function claimBillingEvent/);
  assert.match(route, /billing_webhook_events\?on_conflict=provider,event_id/);
  assert.match(route, /resolution=ignore-duplicates,return=representation/);
  assert.match(route, /if \(!claimed\) return \{ duplicate: true \}/);
  assert.match(route, /rpc\/apply_billing_event_atomic/);
  assert.match(route, /await applyBillingEventAtomic\(event, provider\);/);
  assert.match(route, /await releaseBillingEvent\(event, provider\)\.catch/);
  assert.match(route, /if \(result\.duplicate\) return NextResponse\.json\(\{ received: true, duplicate: true/);

  assert.match(atomicMigration, /insert into public\.billing_accounts/i);
  assert.match(atomicMigration, /insert into public\.organization_entitlements/i);
  assert.match(atomicMigration, /update public\.billing_webhook_events[\s\S]*processed_at/i);
  assert.match(atomicMigration, /security definer/i);
});
