import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("Paddle checkout takes durable service-role reservation before external transaction creation", async () => {
  const source = await load("app/api/billing/checkout/route.ts");
  assert.match(source, /rpc\/reserve_paddle_checkout/);
  assert.match(source, /rpc\/record_paddle_checkout_session/);
  assert.match(source, /rpc\/mark_paddle_checkout_uncertain/);
  const reserve = source.indexOf("rpc/reserve_paddle_checkout");
  const create = source.indexOf("provider.createCheckout");
  assert.ok(reserve > -1 && create > -1 && reserve < create);
  assert.match(source, /p_organization_id: context.organizationId/);
  assert.match(source, /serviceRole: true/);
  assert.match(source, /checkoutReservationId: paddleReservationId/);
  assert.match(source, /An unresolved billing checkout already exists/);
});

test("Paddle reservation is unique per unresolved org and has no expiry-based reopening", async () => {
  const sql = await load("supabase/migrations/20261010090000_fm09_paddle_checkout_reservations.sql");
  assert.match(sql, /create table if not exists public\.billing_checkout_reservations/i);
  assert.match(sql, /unique index if not exists billing_checkout_unresolved_org_uidx/i);
  assert.match(sql, /on public\.billing_checkout_reservations \(organization_id\)[\s\S]*?where state <> 'reconciled'/i);
  assert.match(sql, /select id into v_org_id from public\.organizations[\s\S]*?for update/i);
  assert.match(sql, /on conflict do nothing/i);
  assert.match(sql, /function public\.reserve_paddle_checkout/i);
  assert.match(sql, /function public\.record_paddle_checkout_session/i);
  assert.match(sql, /function public\.mark_paddle_checkout_uncertain/i);
  assert.doesNotMatch(sql, /lease_expires_at|delete from public\.billing_checkout_reservations/i);
  assert.match(sql, /grant execute on function public\.reserve_paddle_checkout[\s\S]*?to service_role/i);
  assert.match(sql, /revoke all on public\.billing_checkout_reservations from public, anon, authenticated/i);
  assert.match(sql, /enable row level security/i);
});

test("verified provider adjustments persist durable cases before 2xx, never touch paid entitlements", async () => {
  const [sql, webhook, provider] = await Promise.all([
    load("supabase/migrations/20261010090000_fm09_paddle_checkout_reservations.sql"),
    load("app/api/billing/webhook/route.ts"),
    load("lib/billing-provider.ts"),
  ]);
  assert.match(sql, /create table if not exists public\.billing_financial_adjustment_events/i);
  assert.match(sql, /unique \(provider, event_id\)/i);
  assert.match(sql, /review_status text not null default 'review_required'/i);
  assert.match(sql, /grant select, insert on public\.billing_financial_adjustment_events to service_role/i);
  assert.doesNotMatch(sql, /grant (?:update|delete) on public\.billing_financial_adjustment_events to authenticated/i);
  assert.match(provider, /parseFinancialAdjustment/);
  assert.match(webhook, /provider\.parseFinancialAdjustment/);
  assert.match(webhook, /lookupBillingOrganization/);
  assert.match(webhook, /billing_financial_adjustment_events\?on_conflict=provider,event_id/);
  assert.match(webhook, /resolution=ignore-duplicates,return=representation/);
  assert.match(webhook, /adjustment: true/);
  assert.match(webhook, /Financial adjustment case could not be persisted/);
  const caseIndex = webhook.indexOf("billing_financial_adjustment_events?on_conflict");
  const lifecycleIndex = webhook.indexOf("parsed = provider.parseWebhook");
  assert.ok(caseIndex >= 0 && lifecycleIndex >= 0 && caseIndex < lifecycleIndex);
});

test("Paddle sandbox-only activation remains enforced after reservation layer", async () => {
  const [adapter, env] = await Promise.all([load("lib/billing-provider.ts"), load(".env.example")]);
  assert.match(adapter, /return paddleSandboxRuntimeAllowed\(\)/);
  assert.match(await load("lib/paddle-sandbox-staging.ts"), /process\.env\.NODE_ENV !== "production"/);
  assert.match(adapter, /PADDLE_SANDBOX_ADAPTER_ENABLED/);
  assert.match(env, /PADDLE_SANDBOX_ADAPTER_ENABLED=0/);
  assert.match(env, /PADDLE_LIVE_ENABLED=0/);
});
