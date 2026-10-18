import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  PRODUCT_ANALYTICS_EVENTS,
  sanitizeProductAnalyticsEvent,
} from "../lib/product-analytics-contract.ts";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("home sample click is recorded as a bounded CTA, never a completed sample review", () => {
  const event = sanitizeProductAnalyticsEvent("sample_opened", {
    surface: "home", url: "https://example.com/path?email=user@example.com",
    answer: "Customer content", email: "user@example.com", arbitrary: "ignore",
  });
  assert.deepEqual(event, {
    event: "public_sample_cta_clicked",
    properties: { surface: "home" },
  });
  assert.ok(PRODUCT_ANALYTICS_EVENTS.includes(event.event));
  assert.notEqual(event.event, "evidence_review_completed");
  assert.notEqual(event.event, "evidence_inspection_opened");
});

test("evidence inspect navigation is a CTA click, not evidence review completion", () => {
  const event = sanitizeProductAnalyticsEvent("evidence_inspected", {
    surface: "home", prompt: "Private question", source_id: "private-id", contents: "private content",
  });
  assert.deepEqual(event, {
    event: "public_evidence_inspection_cta_clicked",
    properties: { surface: "home" },
  });
  assert.notEqual(event.event, "evidence_review_completed");
  assert.notEqual(event.event, "evidence_inspection_opened");
});

test("supported use-case route preserves finite surface attribution", () => {
  assert.deepEqual(
    sanitizeProductAnalyticsEvent("design_partner_cta_clicked", { surface: "use_cases" }),
    { event: "design_partner_cta_clicked", properties: { surface: "use_cases" } },
  );
});

test("untrusted surfaces and customer content are dropped while event itself stays valid", () => {
  for (const event of ["sample_opened", "evidence_inspected"]) {
    assert.deepEqual(
      sanitizeProductAnalyticsEvent(event, {
        surface: "https://foremention.com/contact?intake=private",
        username: "private", full_url: "private", buyerQuestions: "private",
      }),
      {
        event: event === "sample_opened" ? "public_sample_cta_clicked" : "public_evidence_inspection_cta_clicked",
        properties: {},
      },
    );
  }
  assert.equal(sanitizeProductAnalyticsEvent("unknown_analytics_event", {}), null);
});

test("public click emitters are mapped explicitly in the canonical contract", () => {
  const component = source("components/public-activation-analytics.tsx");
  const home = source("components/goat-home-experience.tsx");
  const contract = source("lib/product-analytics-contract.ts");
  assert.match(component, /captureProductEvent\("sample_opened"/);
  assert.match(component, /captureProductEvent\("evidence_inspected"/);
  assert.match(home, /data-public-sample-open/);
  assert.match(home, /data-public-evidence-inspect/);
  assert.match(contract, /"public_sample_cta_clicked"/);
  assert.match(contract, /"public_evidence_inspection_cta_clicked"/);
});
