import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createAcquisitionUnsubscribeToken,
  verifyAcquisitionUnsubscribeToken,
} from "../lib/acquisition-outreach-unsubscribe.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const secret = "u".repeat(40);
const accountId = "11111111-1111-4111-8111-111111111111";
const contactId = "22222222-2222-4222-8222-222222222222";

test("creates and verifies a bounded prospect unsubscribe token", async () => {
  const token = await createAcquisitionUnsubscribeToken(accountId, contactId, secret, 1_000);
  const result = await verifyAcquisitionUnsubscribeToken(token, secret, 2_000);
  assert.deepEqual(result, { accountId, contactId, expiresAt: 31_536_001_000 });
});

test("rejects tampered, expired, cross-purpose and weak-secret tokens", async () => {
  const token = await createAcquisitionUnsubscribeToken(accountId, contactId, secret, 1_000);
  assert.equal(await verifyAcquisitionUnsubscribeToken(`${token}x`, secret, 2_000), null);
  assert.equal(await verifyAcquisitionUnsubscribeToken(token, secret, 31_536_001_001), null);
  await assert.rejects(
    () => createAcquisitionUnsubscribeToken(accountId, contactId, "short", 1_000),
    /Acquisition unsubscribe signing is not configured/,
  );
});

test("unsubscribe endpoint requires a signed token and mutates only on POST", async () => {
  const route = await text("app/api/acquisition/unsubscribe/route.ts");
  assert.match(route, /verifyAcquisitionUnsubscribeToken/);
  assert.match(route, /searchParams\.get\("token"\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  const getBody = route.match(/export async function GET[\s\S]*?(?=export async function POST)/)?.[0] ?? "";
  assert.doesNotMatch(getBody, /suppressAcquisitionContact/);
  assert.match(route, /suppressAcquisitionContact/);
  assert.match(route, /reason:\s*"unsubscribe"/);
  assert.match(route, /sourceSystem:\s*"one_click_unsubscribe"/);
  assert.doesNotMatch(route, /lifecycle_stage|design_partner|customer/);
});
