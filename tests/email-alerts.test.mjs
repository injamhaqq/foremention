import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createEmailUnsubscribeToken, verifyEmailUnsubscribeToken } from "../lib/email-unsubscribe.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const secret = "a-private-test-only-signing-secret-with-32-chars";

test("one-click unsubscribe tokens are signed, scoped, and expire", async () => {
  const token = await createEmailUnsubscribeToken(organizationId, userId, secret, 1_000);
  assert.deepEqual(await verifyEmailUnsubscribeToken(token, secret, 2_000), {
    organizationId,
    userId,
    expiresAt: 15_552_001_000,
  });
  assert.equal(await verifyEmailUnsubscribeToken(`${token}x`, secret, 2_000), null);
  assert.equal(await verifyEmailUnsubscribeToken(token, secret, 15_552_001_001), null);
});

test("workspace email alerts are opt-in, idempotent, and keep auth SMTP separate", async () => {
  const [helper, email, migration, jobs, review] = await Promise.all([
    text("lib/workspace-email-alerts.ts"), text("lib/application-email.ts"),
    text("supabase/migrations/20260802000500_application_email_alerts.sql"),
    text("lib/jobs/inngest.ts"), text("app/api/sources/[id]/review/route.ts"),
  ]);
  assert.match(helper, /preference\?\.email_enabled/);
  assert.match(helper, /resolution=ignore-duplicates/);
  assert.match(helper, /List-Unsubscribe/);
  assert.match(email, /Authentication email stays separate/);
  assert.match(migration, /application_email_deliveries/);
  assert.match(migration, /enable row level security/);
  for (const event of ["first_run_completed", "weekly_digest"]) assert.match(jobs, new RegExp(event));
  assert.doesNotMatch(jobs, /competitor_overtook/);
  assert.match(helper, /input\.kind === "competitor_overtook"/);
  assert.match(review, /brand_new_source/);
  assert.match(review, /brand_lost_source/);
});
