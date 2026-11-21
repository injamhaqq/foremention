// Claims track: the pilot (design-partner) form alerts the operators through
// the existing product-alert email path and is protected by a honeypot, a
// time trap and a per-network rate limit.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
import "./attach-v1-03-support/register.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DESIGN_PARTNER_RATE_LIMIT,
  MIN_FILL_MS,
  designPartnerSpamVerdict,
  operatorAlertOutcome,
} from "../lib/design-partner-spam.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const { POST } = await import("../app/api/design-partner/route.ts");

const valid = {
  email: "ana@acme-software.com",
  company: "Acme Software",
  role: "Head of Growth",
  category: "product analytics",
};

function post(body, contentType = "application/json") {
  return new Request("https://foremention.com/api/design-partner", {
    method: "POST",
    headers: { origin: "https://foremention.com", "content-type": contentType },
    body: contentType === "application/json" ? JSON.stringify(body) : new URLSearchParams(body).toString(),
  });
}

async function withFetch(handler, fn) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init); };
  try { return await fn(calls); } finally { globalThis.fetch = original; }
}

async function withEnv(values, fn) {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const apply = (entries) => { for (const [key, value] of Object.entries(entries)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
  apply(values);
  try { return await fn(); } finally { apply(saved); }
}

async function captureLogs(fn) {
  const lines = [];
  const info = console.info, warn = console.warn;
  console.info = (line) => lines.push(String(line));
  console.warn = (line) => lines.push(String(line));
  try { await fn(); } finally { console.info = info; console.warn = warn; }
  return lines;
}

test("spam verdict: honeypot and too-fast submissions are trapped, normal ones pass", () => {
  const now = 1_800_000_000_000;
  assert.deepEqual(designPartnerSpamVerdict({ ...valid, website: "http://spam" }, now), { trapped: true, reason: "honeypot" });
  assert.deepEqual(designPartnerSpamVerdict({ ...valid, formStartedAt: String(now - 500) }, now), { trapped: true, reason: "too_fast" });
  assert.deepEqual(designPartnerSpamVerdict({ ...valid, formStartedAt: String(now - MIN_FILL_MS - 1) }, now), { trapped: false });
  assert.deepEqual(designPartnerSpamVerdict({ ...valid }, now), { trapped: false }, "JSON clients without a stamp still go through the rate limits");
  assert.deepEqual(designPartnerSpamVerdict({ ...valid, formStartedAt: "not-a-number" }, now), { trapped: false });
});

test("route: a trapped submission gets the normal success response and stores or emails nothing", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-test", RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "alerts@foremention.com", FOREMENTION_COMPANY_OPERATOR_EMAILS: "ops@foremention.com" }, async () => {
    await withFetch(() => { throw new Error("no network call expected"); }, async (calls) => {
      const honeypot = await POST(post({ ...valid, website: "x" }));
      assert.equal(honeypot.status, 201);
      assert.deepEqual(await honeypot.json(), { received: true });
      const fast = await POST(post({ ...valid, formStartedAt: String(Date.now()) }, "application/x-www-form-urlencoded"));
      assert.equal(fast.status, 303);
      assert.match(fast.headers.get("location"), /\/contact\?submitted=1$/);
      assert.equal(calls.length, 0);
    });
  });
});

function fakeBackend({ resendOk = true } = {}) {
  return async (url) => {
    if (url.endsWith("/rest/v1/rpc/claim_design_partner_submission")) return Response.json("accepted");
    if (url.endsWith("/rest/v1/design_partner_applications")) return Response.json([{ id: "6f1c2b9e-1d2a-4c3b-8a4d-123456789abc" }], { status: 201 });
    if (url === "https://api.resend.com/emails") return resendOk ? Response.json({ id: "email_1" }) : new Response("down", { status: 500 });
    return new Response("{}", { status: 200 });
  };
}

test("route: a saved application alerts every operator through the product-alert email and logs the outcome", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-test", RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "alerts@foremention.com", FOREMENTION_COMPANY_OPERATOR_EMAILS: "ops@foremention.com, founder@foremention.com" }, async () => {
    await withFetch(fakeBackend(), async (calls) => {
      const logs = await captureLogs(async () => {
        const response = await POST(post({ ...valid, formStartedAt: String(Date.now() - 10_000) }));
        assert.equal(response.status, 201);
      });
      const emails = calls.filter((call) => call.url === "https://api.resend.com/emails").map((call) => JSON.parse(call.init.body));
      assert.deepEqual(emails.map((email) => email.to[0]).sort(), ["founder@foremention.com", "ops@foremention.com"]);
      assert.match(emails[0].subject, /design-partner application — Acme Software/);
      const alert = logs.map((line) => { try { return JSON.parse(line); } catch { return null; } }).find((entry) => entry?.event === "design_partner_alert");
      assert.deepEqual(alert, { event: "design_partner_alert", route: "/api/design-partner", status: "sent", count: 2 });
      assert.ok(!logs.some((line) => line.includes("ana@acme-software.com")), "logs carry no personal data");
    });
  });
});

test("route: a missing alert configuration or a failed send is logged as a warning instead of passing silently", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-test", RESEND_API_KEY: undefined, RESEND_FROM_EMAIL: undefined, FOREMENTION_COMPANY_OPERATOR_EMAILS: "ops@foremention.com" }, async () => {
    await withFetch(fakeBackend(), async () => {
      const logs = await captureLogs(async () => { assert.equal((await POST(post({ ...valid, category: "crm" }))).status, 201); });
      assert.ok(logs.some((line) => line.includes('"event":"design_partner_alert"') && line.includes('"status":"not_configured"')));
    });
  });
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-test", RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "alerts@foremention.com", FOREMENTION_COMPANY_OPERATOR_EMAILS: "ops@foremention.com" }, async () => {
    await withFetch(fakeBackend({ resendOk: false }), async () => {
      const logs = await captureLogs(async () => { assert.equal((await POST(post({ ...valid, category: "security" }))).status, 201); });
      assert.ok(logs.some((line) => line.includes('"event":"design_partner_alert"') && line.includes('"status":"failed"')));
    });
  });
  assert.equal(operatorAlertOutcome(true, 2, [{ status: "fulfilled", value: 1 }, { status: "rejected", reason: 1 }]), "partial");
  assert.equal(operatorAlertOutcome(true, 0, []), "no_recipients");
});

test("worker applies a per-network rate limit to the pilot form and sends form posts back to /contact", async () => {
  assert.deepEqual({ ...DESIGN_PARTNER_RATE_LIMIT }, { endpoint: "design-partner", limit: 5, windowMs: 3_600_000 });
  const worker = await text("worker/index.ts");
  assert.match(worker, /if \(pathname === "\/api\/design-partner"\) return DESIGN_PARTNER_RATE_LIMIT;/);
  assert.match(worker, /if \(rule\.endpoint === DESIGN_PARTNER_RATE_LIMIT\.endpoint\) return designPartnerLimitedResponse\(request\);/);
  assert.match(worker, /target\.searchParams\.set\("error", "rate-limit"\);[\s\S]*Response\.redirect\(target\.toString\(\), 303\)/);
});

test("contact form renders the honeypot and the time-trap stamp", async () => {
  const contact = await text("app/contact/page.tsx");
  assert.match(contact, /name=\{HONEYPOT_FIELD\} tabIndex=\{-1\} autoComplete="off" aria-hidden="true" hidden/);
  assert.match(contact, /<input type="hidden" name=\{STARTED_AT_FIELD\} value=\{formStartedAtStamp\(\)\} \/>/);
});
