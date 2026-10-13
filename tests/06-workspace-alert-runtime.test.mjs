import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { approvedWorkspaceAlertUrl, workspaceAlertIdempotencyKey } from "../lib/jobs/notification-delivery-policy.mjs";

const source = await readFile(new URL("../lib/workspace-email-alerts.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  fileName: "workspace-email-alerts.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const deliveryId = "11111111-1111-4111-8111-111111111111";
const input = Object.freeze({
  organizationId: "org-synthetic", userId: "user-synthetic", kind: "mention",
  eventKey: "synthetic:once", subject: "Synthetic mention",
  text: "A teammate mentioned you.", href: "/app/runs/synthetic",
});
class UncertainSend extends Error {}

function senderHarness({ optedIn = true, sendError = null, loseDbAck = false } = {}) {
  const writes = [];
  const sent = [];
  let inserted = false;
  const rest = async (path, options) => {
    if (path.startsWith("notification_preferences?")) {
      return [{ email_enabled: optedIn, weekly_digest_enabled: true, unsubscribed_at: null }];
    }
    if (path.startsWith("organization_members?")) return [{ member_email: "member@example.invalid" }];
    if (path.startsWith("application_email_deliveries?on_conflict=")) {
      assert.equal(options.serviceRole, true);
      writes.push({ type: "claim", body: options.body });
      if (inserted) return [];
      inserted = true;
      return [{ id: deliveryId }];
    }
    if (path.startsWith("application_email_deliveries?id=eq.")) {
      assert.equal(options.serviceRole, true);
      writes.push({ type: "settle", body: options.body });
      if (loseDbAck && options.body.status === "sent") throw new Error("Synthetic database ACK lost");
      return [];
    }
    throw new Error("Unexpected database path: " + path);
  };
  const deps = {
    "@/lib/application-email": {
      ApplicationEmailSendUncertainError: UncertainSend,
      sendProductAlertEmail: async (email) => {
        sent.push(email);
        if (sendError) throw sendError;
        return { id: "resend-synthetic-id" };
      },
    },
    "@/lib/jobs/notification-delivery-policy.mjs": { approvedWorkspaceAlertUrl, workspaceAlertIdempotencyKey },
    "@/lib/email-unsubscribe": { createEmailUnsubscribeToken: async () => "synthetic-signed-token" },
    "@/lib/collection-policy": { safeOperationalError: () => "sanitized_operational_failure" },
    "@/lib/supabase-rest": { supabaseRest: rest },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (id) => {
      if (!Object.hasOwn(deps, id)) throw new Error("Unexpected module import: " + id);
      return deps[id];
    },
    process: {
      env: {
        RESEND_API_KEY: "synthetic",
        RESEND_FROM_EMAIL: "no-reply@example.invalid",
        NEXT_PUBLIC_SITE_URL: "https://foremention.com",
        EMAIL_UNSUBSCRIBE_SECRET: "synthetic-signing-secret",
      },
    },
    URL, Date,
  }, { filename: "workspace-email-alerts.synthetic.cjs" });
  return { deliver: exports.sendWorkspaceEmailAlert, writes, sent };
}

test("receipt reservation is unique and send uses a stable provider idempotency key", async () => {
  const h = senderHarness();
  assert.equal((await h.deliver(input)).status, "sent");
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].idempotencyKey, "foremention-alert:" + deliveryId);
  assert.equal(h.sent[0].to, "member@example.invalid");
  assert.match(h.sent[0].text, /https:\/\/foremention.com\/app\/runs\/synthetic/);
  assert.equal(h.writes[0].type, "claim");
  assert.equal(h.writes[1].body.status, "sent");
  assert.equal(h.writes[1].body.provider_message_id, "resend-synthetic-id");
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("provider-side uncertain ACK retains a pending receipt, never auto-replays", async () => {
  const h = senderHarness({ sendError: new UncertainSend("synthetic lost ACK") });
  assert.equal((await h.deliver(input)).status, "uncertain");
  assert.equal(h.writes[1].body.status, "pending");
  assert.equal(h.writes[1].body.error_code, "delivery_outcome_uncertain");
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("lost database ACK after provider acceptance never records failed nor re-sends", async () => {
  const h = senderHarness({ loseDbAck: true });
  assert.equal((await h.deliver(input)).status, "uncertain");
  assert.deepEqual(h.writes.filter((entry) => entry.type === "settle").map((entry) => entry.body.status), ["sent"]);
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("definitive provider rejection can be marked failed without auto-retrying", async () => {
  const h = senderHarness({ sendError: new Error("synthetic definitive rejection") });
  assert.equal((await h.deliver(input)).status, "failed");
  assert.equal(h.writes[1].body.status, "failed");
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("opt-out and unapproved links fail before contact or reserving a delivery", async () => {
  const optedOut = senderHarness({ optedIn: false });
  assert.equal((await optedOut.deliver(input)).status, "disabled");
  assert.equal(optedOut.sent.length, 0);
  assert.equal(optedOut.writes.length, 0);
  const unsafe = senderHarness();
  assert.equal((await unsafe.deliver({ ...input, href: "https://attacker.example/app" })).status, "invalid_link");
  assert.equal(unsafe.sent.length, 0);
  assert.equal(unsafe.writes.length, 0);
});
