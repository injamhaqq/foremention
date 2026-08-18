import assert from "node:assert/strict";
import test from "node:test";

import {
  latencyBucket,
  normalizeInternalAnalyticsId,
  sanitizeProductAnalyticsEvent,
  shouldEnableProductAnalytics,
} from "../lib/product-analytics-contract.ts";

test("analytics accepts only declared events and declared properties", () => {
  const sanitized = sanitizeProductAnalyticsEvent("workflow_started", {
    question_count: 3,
    provider_count: 1,
    provider: "openai",
    workflow_source: "workspace",
    cycle_type: "repeat",
    prompt: "raw customer prompt",
    email: "person@example.com",
    arbitrary: "should never ship",
  });

  assert.deepEqual(sanitized, {
    event: "workflow_started",
    properties: {
      question_count_bucket: "2_5",
      provider_count_bucket: "1",
      provider: "openai",
      workflow_source: "workspace",
      cycle_type: "repeat",
    },
  });
  assert.equal(sanitizeProductAnalyticsEvent("made_up_event", { safe: true }), null);
});

test("analytics rejects customer content even when hidden behind an allowed property key", () => {
  const sanitized = sanitizeProductAnalyticsEvent("workflow_started", {
    provider: "person@example.com",
    workflow_source: "https://customer.example/private",
    cycle_type: "Customer secret answer",
    question_count: 1,
    provider_count: 1,
  });

  assert.deepEqual(sanitized, {
    event: "workflow_started",
    properties: {
      question_count_bucket: "1",
      provider_count_bucket: "1",
    },
  });
});

test("analytics never forwards sensitive keys, nested values, URLs, messages, or secrets", () => {
  const sanitized = sanitizeProductAnalyticsEvent("source_xray_reviewed", {
    brand_present: true,
    crawler_access: "open",
    entry_route: "editorial outreach",
    decision_ready: true,
    name: "Jane Customer",
    answer: "private answer",
    citation: "https://example.com/source",
    url: "https://example.com/private",
    error_message: "token sk-customer-secret",
    stack_trace: "Error: private",
    nested: { email: "person@example.com" },
  });

  assert.deepEqual(sanitized, {
    event: "source_xray_reviewed",
    properties: {
      brand_present: true,
      crawler_access: "open",
      entry_route: "editorial outreach",
      decision_ready: true,
    },
  });
});

test("internal analytics identity accepts UUIDs only", () => {
  const userId = "11111111-2222-4333-8444-555555555555";
  const organizationId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  assert.equal(normalizeInternalAnalyticsId(userId), userId);
  assert.equal(normalizeInternalAnalyticsId(organizationId), organizationId);
  assert.equal(normalizeInternalAnalyticsId("person@example.com"), null);
  assert.equal(normalizeInternalAnalyticsId("Jane Customer"), null);
  assert.equal(normalizeInternalAnalyticsId("https://example.com/user/123"), null);
});

test("performance analytics uses bounded latency buckets rather than raw timings", () => {
  assert.equal(latencyBucket(99), "under_250ms");
  assert.equal(latencyBucket(900), "500_1000ms");
  assert.equal(latencyBucket(9_500), "5_10s");
  assert.equal(latencyBucket(25_000), "10s_plus");
  assert.equal(latencyBucket(Number.NaN), "unknown");
});

test("production analytics cannot initialize on localhost, previews, development, or test", () => {
  assert.equal(shouldEnableProductAnalytics("production", "foremention.com"), true);
  assert.equal(shouldEnableProductAnalytics("production", "www.foremention.com"), true);
  assert.equal(shouldEnableProductAnalytics("production", "preview.foremention.pages.dev"), false);
  assert.equal(shouldEnableProductAnalytics("production", "localhost"), false);
  assert.equal(shouldEnableProductAnalytics("development", "foremention.com"), false);
  assert.equal(shouldEnableProductAnalytics("test", "foremention.com"), false);
});
