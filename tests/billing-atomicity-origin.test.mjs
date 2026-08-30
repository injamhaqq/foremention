import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [webhook, checkout, migration] = await Promise.all([
  text("app/api/billing/webhook/route.ts"),
  text("app/api/billing/checkout/route.ts"),
  text("supabase/migrations/20260830000200_apply_billing_event_atomic.sql"),
]);

test("verified billing state is applied through one atomic database RPC", () => {
  assert.match(migration, /create or replace function public\.apply_billing_event_atomic/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /insert into public\.billing_accounts/i);
  assert.match(migration, /insert into public\.organization_entitlements/i);
  assert.match(migration, /update public\.billing_webhook_events[\s\S]*processed_at/i);
  assert.match(migration, /grant execute on function public\.apply_billing_event_atomic/i);
  assert.match(webhook, /rpc\/apply_billing_event_atomic/);
  assert.doesNotMatch(webhook, /supabaseRest\("billing_accounts\?on_conflict/);
  assert.doesNotMatch(webhook, /supabaseRest\("organization_entitlements\?on_conflict/);
});

test("checkout redirects are anchored to the configured canonical public origin", () => {
  assert.match(checkout, /NEXT_PUBLIC_SITE_URL/);
  assert.match(checkout, /new URL\(configuredSiteUrl\)\.origin/);
  assert.match(checkout, /canonical public site origin/i);
  assert.doesNotMatch(checkout, /const origin = new URL\(request\.url\)\.origin/);
  assert.match(checkout, /successUrl: `\$\{origin\}\/app\/settings\?billing=success`/);
  assert.match(checkout, /cancelUrl: `\$\{origin\}\/app\/settings\?billing=cancelled`/);
});
