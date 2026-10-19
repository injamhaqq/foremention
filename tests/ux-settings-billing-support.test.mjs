// Fix track "ux" (2026-10-19), item 5: Settings gets a billing portal link and
// a support email. The link posts to the existing Paddle customer-portal route
// (app/api/billing/portal). These tests run the REAL route handler with the
// attach02 harness (in-memory PostgREST, recording billing provider stub):
// no network, no Paddle call, no database.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FakePostgrest, USERS, loadModule, request, twoTenantTables, viewerFor, workspaceDeps } from "./attach02-harness.mjs";
import { BILLING_PORTAL_NOTICES, billingPortalNotice, billingPortalNoticePath, prefersHtmlNavigation } from "../lib/billing-portal-notice.ts";
import { SUPPORT_EMAIL, supportMailtoHref } from "../lib/support-contact.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const FORM = { "content-type": "application/x-www-form-urlencoded", accept: "text/html,application/xhtml+xml" };

function setup(provider) {
  const db = new FakePostgrest(twoTenantTables(), new Map());
  const viewer = { current: null };
  const deps = workspaceDeps(db, viewer, { modules: { "@/lib/billing-provider": { billingProvider: () => provider } } });
  const route = loadModule("app/api/billing/portal/route.ts", deps);
  return { route, as(user) { viewer.current = viewerFor(db, user); } };
}
const recordingProvider = (overrides = {}) => {
  const calls = [];
  return { calls, provider: { id: "paddle", configured: () => true, createPortal: async (input) => { calls.push(input); return { url: "https://customer-portal.paddle.test/synthetic" }; }, ...overrides } };
};

test("an owner's Settings form post opens the provider portal for their own customer only", async () => {
  const { calls, provider } = recordingProvider();
  const env = setup(provider);
  env.as(USERS.bOwner);
  const response = await env.route.POST(request("/api/billing/portal", { headers: FORM }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://customer-portal.paddle.test/synthetic");
  assert.deepEqual(calls.map((call) => call.customerId), ["ctm_synthetic_org_b"]);
  assert.equal(calls[0].returnUrl, "https://foremention.com/app/settings");
});

test("form posts that cannot open the portal return to Settings with a fixed notice, not raw JSON", async () => {
  const { calls, provider } = recordingProvider();
  const env = setup(provider);
  env.as(USERS.aAnalyst);
  let response = await env.route.POST(request("/api/billing/portal", { headers: FORM }));
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get("location")).pathname + new URL(response.headers.get("location")).search, "/app/settings?billing_portal=owner_only");
  env.as(USERS.aOwner); // org A has no billing customer
  response = await env.route.POST(request("/api/billing/portal", { headers: FORM }));
  assert.equal(response.status, 303);
  assert.match(response.headers.get("location"), /^https:\/\/foremention\.com\/app\/settings\?billing_portal=no_customer#plan$/);
  assert.deepEqual(calls, [], "no portal session was created for a refused request");

  const unconfigured = setup({ id: "paddle", configured: () => false, createPortal: async () => { throw new Error("must not be called"); } });
  unconfigured.as(USERS.bOwner);
  response = await unconfigured.route.POST(request("/api/billing/portal", { headers: FORM }));
  assert.match(response.headers.get("location"), /billing_portal=unavailable/);

  const failing = setup({ id: "paddle", configured: () => true, createPortal: async () => { throw new Error("Paddle said: secret internal detail"); } });
  failing.as(USERS.bOwner);
  response = await failing.route.POST(request("/api/billing/portal", { headers: FORM }));
  assert.match(response.headers.get("location"), /billing_portal=provider_error/);
  assert.doesNotMatch(response.headers.get("location"), /secret/);
});

test("JSON clients keep the existing status-code contract", async () => {
  const { provider } = recordingProvider();
  const env = setup(provider);
  env.as(USERS.aAnalyst);
  assert.equal((await env.route.POST(request("/api/billing/portal", { headers: { accept: "application/json" } }))).status, 403);
  env.as(USERS.aOwner);
  const response = await env.route.POST(request("/api/billing/portal"));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /No verified billing customer/);
  // Cross-origin posts are still refused before anything else.
  assert.equal((await env.route.POST(request("/api/billing/portal", { origin: "https://evil.example", headers: FORM }))).status, 403);
});

test("notice codes are a closed list and the redirect target is same-origin relative", () => {
  assert.equal(billingPortalNotice("owner_only"), BILLING_PORTAL_NOTICES.owner_only);
  for (const value of ["", null, undefined, "toString", "__proto__", "<script>", "constructor"]) assert.equal(billingPortalNotice(value), null, String(value));
  for (const code of Object.keys(BILLING_PORTAL_NOTICES)) assert.match(billingPortalNoticePath(code), /^\/app\/settings\?billing_portal=[a-z_]+#plan$/);
  const html = new Request("https://foremention.com/x", { method: "POST", headers: FORM });
  const json = new Request("https://foremention.com/x", { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(prefersHtmlNavigation(html), true);
  assert.equal(prefersHtmlNavigation(json), false);
  assert.equal(prefersHtmlNavigation(new Request("https://foremention.com/x", { method: "POST" })), false);
});

test("Settings shows the billing portal link and the existing support address", async () => {
  const settings = await text("app/app/settings/page.tsx");
  assert.equal(SUPPORT_EMAIL, "hello@foremention.com", "reuses the support address already in the codebase");
  assert.equal(supportMailtoHref("Foremention billing"), "mailto:hello@foremention.com?subject=Foremention%20billing");
  assert.match(settings, /<form action="\/api\/billing\/portal" method="post"[^>]*><button[^>]*type="submit">Open billing portal<\/button>/);
  assert.match(settings, /team\.role !== "owner"/, "only owners get the portal button");
  assert.match(settings, /billingProviderConfigured\(\)/);
  assert.match(settings, /billingPortalNotice\(query\.billing_portal\)/);
  assert.match(settings, /href=\{supportMailtoHref\("Foremention workspace support"\)\}>\{SUPPORT_EMAIL\}<\/a>/);
  assert.match(settings, /Email support<\/a>/);
  assert.match(settings, /id="billing-portal"/);
});
