import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const canaryPath = join(root, "lib", "acquisition-zoho-canary.ts");
const jobPath = join(root, "lib", "jobs", "acquisition-zoho-replies.ts");
const replyRuntimePath = join(root, "lib", "acquisition-zoho-reply-runtime.ts");
const migrationPath = join(root, "supabase", "migrations", "20260905000100_acquisition_zoho_mail_canaries.sql");

const envSnapshot = { ...process.env };
const resetEnv = () => {
  for (const key of Object.keys(process.env)) if (!(key in envSnapshot)) delete process.env[key];
  Object.assign(process.env, envSnapshot);
};

test.afterEach(resetEnv);

async function canaryModule() {
  assert.equal(existsSync(canaryPath), true, "Zoho canary runtime must exist before the canary can be enabled");
  return import(pathToFileURL(canaryPath).href);
}

test("Zoho canary is fail-closed and can only run while real acquisition sending is disabled", async () => {
  const { canaryConfigFromEnv } = await canaryModule();
  Object.assign(process.env, {
    ACQUISITION_OUTREACH_PROVIDER: "zoho",
    ACQUISITION_OUTREACH_CANARY_ENABLED: "true",
    ACQUISITION_OUTREACH_CANARY_EMAIL: "owner@example.com",
    ACQUISITION_OUTREACH_FROM_EMAIL: "Injam <injam@foremention.com>",
    ACQUISITION_OUTREACH_REPLY_TO_EMAIL: "injam@foremention.com",
    ACQUISITION_OUTREACH_SEND_ENABLED: "false",
  });
  assert.deepEqual(canaryConfigFromEnv(), {
    recipientEmail: "owner@example.com",
    senderEmail: "injam@foremention.com",
  });

  process.env.ACQUISITION_OUTREACH_SEND_ENABLED = "true";
  assert.equal(canaryConfigFromEnv(), null);
  process.env.ACQUISITION_OUTREACH_SEND_ENABLED = "false";
  process.env.ACQUISITION_OUTREACH_PROVIDER = "resend";
  assert.equal(canaryConfigFromEnv(), null);
  process.env.ACQUISITION_OUTREACH_PROVIDER = "zoho";
  process.env.ACQUISITION_OUTREACH_CANARY_EMAIL = "injam@foremention.com";
  assert.equal(canaryConfigFromEnv(), null);
});

test("Zoho canary message is explicitly internal verification and not customer/prospect evidence", async () => {
  const { buildZohoCanaryMessage } = await canaryModule();
  const message = buildZohoCanaryMessage("canary-123");
  assert.match(message.subject, /controlled/i);
  assert.match(message.content, /internal verification/i);
  assert.match(message.content, /reply/i);
  assert.match(message.content, /FOREMENTION CANARY OK/);
  assert.doesNotMatch(message.content, /unsubscribe/i);
  assert.doesNotMatch(message.content, /prospect/i);
});

test("Zoho canary reply correlation requires both the provider Message-ID and exact canary sender", async () => {
  const { canaryReplyMatches } = await canaryModule();
  const canary = {
    recipient_email: "owner@example.com",
    provider_message_id: "<canary-message@zoho.com>",
  };
  assert.equal(canaryReplyMatches(canary, ["<older@example.com>", "<canary-message@zoho.com>"], "Owner <owner@example.com>"), true);
  assert.equal(canaryReplyMatches(canary, ["<different@zoho.com>"], "owner@example.com"), false);
  assert.equal(canaryReplyMatches(canary, ["<canary-message@zoho.com>"], "attacker@example.com"), false);
});

test("reply cron sends at most one controlled canary and can verify it before normal reply polling is enabled", () => {
  const job = readFileSync(jobPath, "utf8");
  const runtime = readFileSync(replyRuntimePath, "utf8");
  assert.match(job, /runZohoAcquisitionCanary/);
  assert.match(job, /ensure-zoho-acquisition-canary/);
  assert.match(job, /poll-zoho-acquisition-replies/);
  assert.match(job, /\*\/15 \* \* \* \*/);
  assert.match(runtime, /processZohoCanaryReplyMessage/);
  assert.match(runtime, /ACQUISITION_OUTREACH_CANARY_ENABLED/);
  assert.match(runtime, /canaryProcessed/);
  assert.match(runtime, /verificationMode/);
});

test("canary ledger is service-only, RLS-protected, and distinct from customer acquisition evidence", () => {
  assert.equal(existsSync(migrationPath), true, "canary ledger migration must exist");
  if (!existsSync(migrationPath)) return;
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /create table if not exists public\.acquisition_zoho_mail_canaries/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.acquisition_zoho_mail_canaries from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.acquisition_zoho_mail_canaries to service_role/i);
  assert.doesNotMatch(migration, /commercial_contacts/i);
  assert.doesNotMatch(migration, /acquisition_reply_events/i);
});
