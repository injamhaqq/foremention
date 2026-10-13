import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { paddleSubscriptionIdentityMatches } from "../lib/paddle-lifecycle-admission.ts";

const organization = "11111111-1111-4111-8111-111111111111";
const otherOrganization = "22222222-2222-4222-8222-222222222222";
const customer = "ctm_" + "a".repeat(26);
const subscription = "sub_" + "b".repeat(26);
const row = { organization_id: organization, external_customer_id: customer, external_subscription_id: subscription };

test("a verified Paddle lifecycle event needs one matching stored subscription and customer", () => {
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, customer, subscription), true);
});

test("metadata-only and missing provider identities never mutate a billing account", () => {
  assert.equal(paddleSubscriptionIdentityMatches([], organization, customer, subscription), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, null, subscription), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, customer, null), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, "ctm_invalid", subscription), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, customer, "sub_invalid"), false);
});

test("cross-workspace, cross-customer, cross-subscription and nonunique records fail closed", () => {
  assert.equal(paddleSubscriptionIdentityMatches([row], otherOrganization, customer, subscription), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, "ctm_" + "c".repeat(26), subscription), false);
  assert.equal(paddleSubscriptionIdentityMatches([row], organization, customer, "sub_" + "d".repeat(26)), false);
  assert.equal(paddleSubscriptionIdentityMatches([row, row], organization, customer, subscription), false);
});

test("billing webhook uses identity admission for both recurring charges and non-payment lifecycle changes", async () => {
  const route = await readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  assert.match(route, /paddleSubscriptionIdentityMatches\(rows, organizationId, parsed\.externalCustomerId, parsed\.externalSubscriptionId\)/);
  assert.match(route, /paddleSubscriptionLifecycleAdmitted\(parsed, organizationId\)/);
  assert.match(route, /provider\.id === "paddle"/);
  assert.match(route, /status: 503/);
});
