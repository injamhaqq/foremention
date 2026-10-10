// Refs #516 #517 — package-based capacity set by verified billing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buyerQuestionLimit, FOUNDATION_ACCESS_LIMITS, PACKAGE_CAPACITY } from "../lib/product-limits.ts";

const source = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

test("package capacity matches the published /pricing page", () => {
  const pricing = source("app/pricing/page.tsx");
  assert.match(pricing, new RegExp(`Up to ${PACKAGE_CAPACITY.core.buyerQuestions} approved buyer questions`));
  assert.match(pricing, new RegExp(`Up to ${PACKAGE_CAPACITY.signal.buyerQuestions} approved buyer questions`));
  assert.equal(PACKAGE_CAPACITY.core.buyerQuestions, 25);
  assert.equal(PACKAGE_CAPACITY.signal.buyerQuestions, 100);
  assert.equal(FOUNDATION_ACCESS_LIMITS.buyerQuestions, 10);
});

test("verified-billing Core and Signal raise the server-side question ceiling", () => {
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "core", billing_source: "paddle", max_prompts: 25 }), 25);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "signal", billing_source: "paddle", max_prompts: 100 }), 100);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "signal", billing_source: "stripe", max_prompts: 100, expires_at: future }), 100);
});

test("capacity fails closed to Foundation without an active, unexpired, verified paid entitlement", () => {
  assert.equal(buyerQuestionLimit(null), 10);
  assert.equal(buyerQuestionLimit(undefined), 10);
  assert.equal(buyerQuestionLimit({ status: "cancelled", package_key: "signal", billing_source: "paddle", max_prompts: 100 }), 10);
  assert.equal(buyerQuestionLimit({ status: "paused", package_key: "core", billing_source: "paddle", max_prompts: 25 }), 10);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "signal", billing_source: "paddle", max_prompts: 100, expires_at: past }), 10);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "signal", billing_source: "paddle", max_prompts: 100, expires_at: "garbage" }), 10);
  // A verified-billing row can never exceed its package ceiling, nor unlock an unpaid package.
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "core", billing_source: "paddle", max_prompts: 100 }), 25);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "private_beta", billing_source: "paddle", max_prompts: 100 }), 10);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "signal", billing_source: "paddle", max_prompts: null }), 10);
});

test("founder/manual grants keep their explicitly stored capacity", () => {
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "private_beta", billing_source: "founder_grant", max_prompts: 10 }), 10);
  assert.equal(buyerQuestionLimit({ status: "active", package_key: "custom", billing_source: "founder_grant", max_prompts: 40 }), 40);
});

test("prompts route enforces the entitlement ceiling server-side, not the old hard cap of 10", () => {
  const route = source("app/api/prompts/route.ts");
  assert.match(route, /buyerQuestionLimit\(entitlementRows\[0\]\)/);
  assert.match(route, /organization_entitlements\?select=status,package_key,billing_source,expires_at,max_prompts/);
  assert.match(route, /existing\.length >= questionLimit/);
  assert.ok(!route.includes("existing.length >= FOUNDATION_ACCESS_LIMITS.buyerQuestions"));
  // The ceiling check must run before any prompt row is written.
  assert.ok(route.indexOf("existing.length >= questionLimit") < route.indexOf('supabaseRest<Array<{ id: string; version: number }>>("prompts"'));
});

test("database derives capacity from verified provider billing only, in the same transaction", () => {
  const sql = source("supabase/migrations/20261011090000_package_capacity_from_verified_billing.sql");
  assert.match(sql, /new\.billing_source not in \('stripe', 'creem', 'paddle'\)[\s\S]*return new;/);
  assert.match(sql, /package_key = 'signal' then\s+new\.max_prompts := 100;\s+new\.monthly_run_units := 500;\s+new\.max_brands := 3;/);
  assert.match(sql, /package_key = 'core' then\s+new\.max_prompts := 25;\s+new\.monthly_run_units := 25;\s+new\.max_brands := 1;/);
  assert.match(sql, /else\s+new\.max_prompts := 10;\s+new\.monthly_run_units := 20;\s+new\.max_brands := 1;/);
  assert.match(sql, /new\.status = 'active'\s+and \(new\.expires_at is null or new\.expires_at > now\(\)\)/);
  assert.match(sql, /before insert or update of status, package_key, billing_source, expires_at, max_prompts, monthly_run_units, max_brands/);
  assert.match(sql, /revoke all on function public\.billing_package_capacity_v1\(\) from public, anon, authenticated;/);
  const runUnits = PACKAGE_CAPACITY.signal.runUnitsPerMonth;
  assert.equal(runUnits, 500);
  assert.equal(PACKAGE_CAPACITY.core.runUnitsPerMonth, 25);
});
