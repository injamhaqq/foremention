// Chat06 CV-12: runtime contract for the flag-gated fenced e-mail claim/settle
// path in lib/workspace-email-alerts.ts. The database side is the proposal
// migration docs/execution/attach-v1/06-proposals/migrations/
// 20261013150000_chat06_email_delivery_claim_settle.proposal.sql, verified
// separately on disposable PGlite (probe in 06-proposals/verification/).
// Here a small in-memory model of the RPCs stands in for PostgREST.
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
const deliveryId = "22222222-2222-4222-8222-222222222222";
const input = Object.freeze({
  organizationId: "org-synthetic", userId: "user-synthetic", kind: "mention",
  eventKey: "synthetic:lease", subject: "Synthetic mention",
  text: "A teammate mentioned you.", href: "/app/runs/synthetic",
});
class UncertainSend extends Error {}

function leaseHarness({ flag = "enabled", sendErrors = [], loseSettleAck = false, eligible = true, keyOverride = null, tokenFails = false } = {}) {
  const calls = [];
  const sent = [];
  const settles = [];
  const row = { exists: false, status: "pending", generation: 0, lease: null, leaseActive: false, uncertain: false, messageId: null };
  let token = 0;
  const rest = async (path, options = {}) => {
    calls.push(path.split("?")[0]);
    if (path.startsWith("notification_preferences?")) return [{ email_enabled: true, weekly_digest_enabled: true, unsubscribed_at: null }];
    if (path.startsWith("organization_members?")) return [{ member_email: "precheck@example.invalid" }];
    assert.equal(options.serviceRole, true, "RPCs must use the service role");
    if (path === "rpc/enqueue_application_email_delivery") {
      assert.deepEqual(Object.keys(options.body).sort(), ["p_event_key", "p_kind", "p_organization_id", "p_user_id"]);
      const created = !row.exists; row.exists = true;
      return { delivery_id: deliveryId, created };
    }
    if (path === "rpc/claim_application_email_delivery") {
      assert.equal(options.body.p_organization_id, input.organizationId);
      if (row.status !== "pending") return { claimed: false, reason: "already_settled" };
      if (row.uncertain) return { claimed: false, reason: "held_uncertain" };
      if (row.leaseActive) return { claimed: false, reason: "leased_elsewhere" };
      if (!eligible) { row.status = "skipped"; return { claimed: false, reason: "recipient_not_eligible" }; }
      row.generation += 1; row.lease = "lease-" + (++token); row.leaseActive = true;
      return {
        claimed: true, delivery_id: deliveryId, generation: row.generation, lease_token: row.lease,
        idempotency_key: keyOverride ?? "foremention-alert:" + deliveryId, recipient_email: "db-current@example.invalid",
      };
    }
    if (path === "rpc/settle_application_email_delivery") {
      const b = options.body;
      settles.push(b);
      if (b.p_generation !== row.generation) return { settled: false, reason: "stale_generation" };
      if (b.p_lease_token !== row.lease) return { settled: false, reason: "lease_mismatch" };
      row.leaseActive = false; row.lease = null;
      if (b.p_outcome === "sent") { row.status = "sent"; row.messageId = b.p_provider_message_id; }
      else if (b.p_outcome === "uncertain") row.uncertain = true;
      else row.status = "failed";
      if (loseSettleAck && b.p_outcome === "sent") { loseSettleAck = false; row.status = "pending"; row.leaseActive = true; row.lease = "lost"; throw new Error("Synthetic database ACK lost"); }
      return { settled: true, status: row.status };
    }
    if (path.startsWith("application_email_deliveries")) throw new Error("direct table write must not happen on the lease path: " + path);
    throw new Error("Unexpected database path: " + path);
  };
  const deps = {
    "@/lib/application-email": {
      ApplicationEmailSendUncertainError: UncertainSend,
      sendProductAlertEmail: async (email) => {
        sent.push(email);
        const error = sendErrors.shift();
        if (error) throw error;
        return { id: "resend-synthetic-" + sent.length };
      },
    },
    "@/lib/jobs/notification-delivery-policy.mjs": { approvedWorkspaceAlertUrl, workspaceAlertIdempotencyKey },
    "@/lib/email-unsubscribe": { createEmailUnsubscribeToken: async () => { if (tokenFails) throw new Error("no key"); return "synthetic-signed-token"; } },
    "@/lib/collection-policy": { safeOperationalError: () => "sanitized_operational_failure" },
    "@/lib/supabase-rest": { supabaseRest: rest },
  };
  const env = {
    RESEND_API_KEY: "synthetic", RESEND_FROM_EMAIL: "no-reply@example.invalid",
    NEXT_PUBLIC_SITE_URL: "https://foremention.com", EMAIL_UNSUBSCRIBE_SECRET: "synthetic-signing-secret",
  };
  if (flag) env.FOREMENTION_EMAIL_DELIVERY_LEASE = flag;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (id) => { if (!Object.hasOwn(deps, id)) throw new Error("Unexpected module import: " + id); return deps[id]; },
    process: { env }, URL, Date,
  }, { filename: "workspace-email-alerts.lease.synthetic.cjs" });
  const expireLease = () => { row.leaseActive = false; };
  return { deliver: exports.sendWorkspaceEmailAlert, calls, sent, settles, row, expireLease };
}

test("flag unset keeps the existing direct path (no lease RPCs)", async () => {
  const h = leaseHarness({ flag: null });
  await assert.rejects(() => h.deliver(input), /Unexpected database path|direct table write/);
  assert.ok(!h.calls.some((c) => c.startsWith("rpc/")), "no RPC without the flag");
});

test("lease path: enqueue, claim, send with stable key to DB-current recipient, settle sent with receipt", async () => {
  const h = leaseHarness();
  assert.equal((await h.deliver(input)).status, "sent");
  assert.deepEqual(h.calls.filter((c) => c.startsWith("rpc/")), [
    "rpc/enqueue_application_email_delivery", "rpc/claim_application_email_delivery", "rpc/settle_application_email_delivery",
  ]);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].idempotencyKey, "foremention-alert:" + deliveryId);
  assert.equal(h.sent[0].to, "db-current@example.invalid");
  assert.match(h.sent[0].text, /https:\/\/foremention.com\/app\/runs\/synthetic/);
  assert.equal(h.settles[0].p_outcome, "sent");
  assert.equal(h.settles[0].p_generation, 1);
  assert.equal(h.settles[0].p_provider_message_id, "resend-synthetic-1");
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("duplicate event while another worker holds the lease does not send", async () => {
  const h = leaseHarness();
  h.row.exists = true; h.row.generation = 1; h.row.lease = "other"; h.row.leaseActive = true;
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 0);
});

test("provider-uncertain outcome is settled as held and never replayed", async () => {
  const h = leaseHarness({ sendErrors: [new UncertainSend("synthetic lost HTTP ACK")] });
  assert.equal((await h.deliver(input)).status, "uncertain");
  assert.equal(h.settles[0].p_outcome, "uncertain");
  assert.equal(h.settles[0].p_error_code, "delivery_outcome_uncertain");
  assert.equal((await h.deliver(input)).status, "duplicate");
  assert.equal(h.sent.length, 1);
});

test("database ACK loss after provider acceptance: uncertain now, reclaim after lease expiry reuses the same provider key", async () => {
  const h = leaseHarness({ loseSettleAck: true });
  assert.equal((await h.deliver(input)).status, "uncertain");
  assert.ok(!h.settles.some((s) => s.p_outcome.startsWith("failed")), "never recorded as failed");
  assert.equal((await h.deliver(input)).status, "duplicate", "active lease blocks a second send");
  h.expireLease();
  assert.equal((await h.deliver(input)).status, "sent");
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[1].idempotencyKey, h.sent[0].idempotencyKey, "provider dedupes on the stable key");
  assert.equal(h.settles.at(-1).p_generation, 2);
});

test("recipient not eligible at claim time is reported disabled without contact", async () => {
  const h = leaseHarness({ eligible: false });
  assert.equal((await h.deliver(input)).status, "disabled");
  assert.equal(h.sent.length, 0);
});

test("definitive provider rejection settles failed_permanent without retry", async () => {
  const h = leaseHarness({ sendErrors: [new Error("synthetic 422")] });
  assert.equal((await h.deliver(input)).status, "failed");
  assert.equal(h.settles[0].p_outcome, "failed_permanent");
  assert.equal(h.settles[0].p_error_code, "provider_rejected");
  assert.equal(h.sent.length, 1);
});

test("claim contract mismatch (unexpected idempotency key) never contacts the provider", async () => {
  const h = leaseHarness({ keyOverride: "foremention-alert:someone-else" });
  assert.equal((await h.deliver(input)).status, "failed");
  assert.equal(h.sent.length, 0);
  assert.equal(h.settles[0].p_error_code, "lease_contract_mismatch");
});

test("unsubscribe token failure settles failed before contact", async () => {
  const h = leaseHarness({ tokenFails: true });
  assert.equal((await h.deliver(input)).status, "failed");
  assert.equal(h.sent.length, 0);
  assert.equal(h.settles[0].p_error_code, "unsubscribe_token_unavailable");
});

test("proposal migration pins the same idempotency key format and service_role-only RPCs", async () => {
  const sql = await readFile(new URL("../docs/execution/attach-v1/06-proposals/migrations/20261013150000_chat06_email_delivery_claim_settle.proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /generated always as \('foremention-alert:' \|\| id::text\) stored/);
  assert.equal(workspaceAlertIdempotencyKey(deliveryId), "foremention-alert:" + deliveryId);
  for (const fn of ["enqueue_application_email_delivery", "claim_application_email_delivery", "settle_application_email_delivery"]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated;`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role;`));
  }
});
