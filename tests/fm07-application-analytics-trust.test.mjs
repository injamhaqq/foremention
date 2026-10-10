import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isServerVerifiedProductEvent } from "../lib/product-analytics-authority.ts";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("browser-side application receipt is not an authoritative conversion", () => {
  assert.equal(isServerVerifiedProductEvent("design_partner_application_submitted"), true);
  for (const event of [
    "design_partner_page_viewed",
    "design_partner_application_started",
    "design_partner_cta_impression",
    "design_partner_cta_clicked",
    "score_viewed",
    "$pageview",
    "$identify",
  ]) {
    assert.equal(isServerVerifiedProductEvent(event), false, event);
  }
  for (const malformed of ["", "submitted", "design_partner_application_submit", "design_partner_application_submitted\n"]) {
    assert.equal(isServerVerifiedProductEvent(malformed), false);
  }
});

test("client capture rejects server-only conversion before PostHog initialization", () => {
  const client = read("lib/product-analytics.ts");
  const capture = client.slice(client.indexOf("export function captureProductEvent("), client.indexOf("export function identifyProductAnalyticsUser("));
  const boundary = capture.indexOf("if (isServerVerifiedProductEvent(event)) return;");
  assert.ok(boundary >= 0, "capture must reject server-only events");
  assert.ok(boundary < capture.indexOf("initializeProductAnalytics()"), "do not initialize SDK for a blocked event");
  assert.ok(boundary < capture.indexOf("posthog.capture("), "do not send blocked client conversions");
});

test("PostHog before_send also rejects direct SDK browser attempts", () => {
  const client = read("lib/product-analytics.ts");
  const hook = client.slice(client.indexOf("function sanitizePostHogPayload("), client.indexOf("export function initializeProductAnalytics("));
  const boundary = hook.indexOf("if (isServerVerifiedProductEvent(event.event)) return null;");
  assert.ok(boundary >= 0, "before_send must reject direct SDK capture and spoofed event names");
  assert.ok(boundary < hook.indexOf("sanitizeProductAnalyticsEvent("), "reject before allowlist and transport");
  assert.ok(boundary < hook.indexOf("event.event === \"$identify\""), "commercial event block precedes identification");
  assert.match(client, /before_send: \(event\) => sanitizePostHogPayload\(event\)/);
});

test("authoritative intake persistence remains a first-party database operation", () => {
  const route = read("app/api/design-partner/route.ts");
  const accepted = route.indexOf('if (claim !== "accepted") throw new Error');
  const persisted = route.indexOf('const rows = await supabaseRest("design_partner_applications"');
  const receipt = route.indexOf('return responseFor(request, 201, "Application received.", { intakeId })');
  assert.ok(accepted >= 0 && persisted > accepted && receipt > persisted);
  assert.match(route, /prefer: "return=representation"/);
  assert.match(route, /if \(!intakeId\) throw new Error/);
  assert.doesNotMatch(route, /posthog\.capture|captureProductEvent/, "this candidate does not claim server-side analytics is implemented");
});

test("blocked client capture does not redefine or eliminate noncommercial intent events", () => {
  const client = read("lib/product-analytics.ts");
  const contract = read("lib/product-analytics-contract.ts");
  assert.match(contract, /"design_partner_application_submitted"/);
  for (const event of ["design_partner_page_viewed", "design_partner_application_started", "design_partner_cta_clicked"]) {
    assert.match(contract, new RegExp(`"${event}"`));
  }
  assert.match(client, /const sanitized = sanitizeProductAnalyticsEvent\(event, properties\);/);
  assert.match(client, /posthog\.capture\(sanitized\.event, sanitized\.properties\);/);
});
