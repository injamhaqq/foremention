import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("activation funnel exposes every canonical decision-grade milestone without a second analytics system", () => {
  const contract = read("lib/product-analytics-contract.ts");
  const sources = [
    read("components/public-activation-analytics.tsx"),
    read("components/visibility-score-form.tsx"),
    read("components/auth-form.tsx"),
    read("components/workspace-activation-analytics.tsx"),
    read("components/onboarding-wizard.tsx"),
    read("components/product-event.tsx"),
    read("components/source-review-form.tsx"),
    contract,
  ].join("\n");

  for (const event of [
    "score_viewed",
    "score_started",
    "score_completed",
    "signup_started",
    "signup_completed",
    "auth_session_established",
    "activation_setup_started",
    "activation_context_ready",
    "activation_setup_completed",
    "workflow_started",
    "workflow_completed",
    "workflow_failed",
    "ai_result_viewed",
    "citation_result_viewed",
    "source_xray_viewed",
    "source_xray_reviewed",
    "decision_insight_reached",
  ]) {
    assert.match(contract, new RegExp(`"${event}"`), `missing canonical activation milestone ${event}`);
  }

  assert.doesNotMatch(sources, /segment|mixpanel|amplitude/i);
});

test("activation events use the fail-closed product contract and never expose customer-content properties", () => {
  const contract = read("lib/product-analytics-contract.ts");
  assert.match(contract, /sanitizeProductAnalyticsEvent/);
  assert.match(contract, /if \(!EVENT_NAMES\.has\(normalized\.event\)\) return null/);
  for (const forbiddenKey of ["password", "secret", "answer", "prompt", "citation", "content", "message", "url"]) {
    assert.doesNotMatch(contract, new RegExp(`properties\\["${forbiddenKey}"\\]`, "i"), `contract must not emit ${forbiddenKey}`);
  }

  const publicAnalytics = read("components/public-activation-analytics.tsx");
  for (const forbiddenKey of ["email", "brand", "category", "score_id", "url", "prompt", "answer", "citation"]) {
    assert.doesNotMatch(publicAnalytics, new RegExp(`(?:\\{|,)\\s*${forbiddenKey}\\s*:`, "i"), `public activation analytics must not send ${forbiddenKey}`);
  }
  assert.match(publicAnalytics, /method: "email"/);
  assert.match(publicAnalytics, /method: "google"/);

  const workspaceAnalytics = read("components/workspace-activation-analytics.tsx");
  for (const forbiddenKey of ["run_id", "source_id", "pathname", "url", "prompt", "answer", "citation"]) {
    assert.doesNotMatch(workspaceAnalytics, new RegExp(`(?:\\{|,)\\s*${forbiddenKey}\\s*:`, "i"), `workspace activation analytics must not send ${forbiddenKey}`);
  }
});

test("production PostHog persistence stays first-party and does not probe parent cookie domains", () => {
  const source = read("lib/product-analytics.ts");
  assert.match(source, /persistence: "localStorage\+cookie"/);
  assert.match(source, /cross_subdomain_cookie: false/);
  assert.match(source, /secure_cookie: window\.location\.protocol === "https:"/);
});

test("workspace milestones exclude demo data and require real evidence surfaces", () => {
  const source = read("components/workspace-activation-analytics.tsx");
  assert.match(source, /if \(demo\) return/);
  assert.match(source, /\.answer-stack > article\.panel/);
  assert.match(source, /\.answer-citations a/);
  assert.match(source, /source_xray_viewed/);
  assert.match(source, /sessionStorage/);
});

test("decision insight is emitted only when the review API creates a new actionable opportunity", () => {
  const source = read("components/source-review-form.tsx");
  assert.match(source, /if \(result\.opportunity\?\.action === "created"\) \{[\s\S]*?captureProductEvent\("decision_insight_reached", \{ insight_type: "actionable_source_gap" \}\);[\s\S]*?\}/);
  assert.equal((source.match(/captureProductEvent\("decision_insight_reached"/g) || []).length, 1);
  assert.doesNotMatch(source, /captureProductEvent\("activation_completed"/);
  assert.doesNotMatch(source, /captureProductEvent\("reviewed_opportunity_created"/);
});

test("activation observers are mounted at public and authenticated boundaries", () => {
  const rootLayout = read("app/layout.tsx");
  const workspaceLayout = read("app/app/layout.tsx");
  assert.match(rootLayout, /<PublicActivationAnalytics \/>/);
  assert.match(workspaceLayout, /<WorkspaceActivationAnalytics demo=\{viewer\.mode === "demo"\} \/>/);
  assert.match(workspaceLayout, /<PostHogIdentity/);
});
