import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("activation funnel exposes every decision-grade milestone without a second analytics system", () => {
  const sources = [
    read("components/public-activation-analytics.tsx"),
    read("components/visibility-score-form.tsx"),
    read("components/auth-form.tsx"),
    read("components/workspace-activation-analytics.tsx"),
    read("components/onboarding-wizard.tsx"),
    read("components/product-event.tsx"),
    read("components/run-review.tsx"),
    read("components/source-review-form.tsx"),
  ].join("\n");

  for (const event of [
    "score_viewed",
    "score_started",
    "score_completed",
    "score_monitor_clicked",
    "signup_started",
    "signup_completed",
    "auth_session_established",
    "onboarding_started",
    "onboarding_completed",
    "collection_started",
    "collection_completed",
    "ai_result_viewed",
    "citation_result_viewed",
    "source_xray_viewed",
    "evidence_reviewed",
    "reviewed_opportunity_created",
  ]) {
    assert.match(sources, new RegExp(`\\b${event}\\b`), `missing activation milestone ${event}`);
  }

  assert.doesNotMatch(sources, /segment|mixpanel|amplitude/i);
});

test("activation events preserve the existing sensitive-property denylist", () => {
  const analytics = read("lib/product-analytics.ts");
  for (const sensitiveKey of ["email", "name", "password", "token", "secret", "answer", "prompt", "citation", "content", "message", "url"]) {
    assert.match(analytics, new RegExp(sensitiveKey, "i"), `missing denylisted analytics key ${sensitiveKey}`);
  }

  const publicAnalytics = read("components/public-activation-analytics.tsx");
  for (const forbiddenKey of ["email", "brand", "category", "score_id", "url", "prompt", "answer", "citation"]) {
    assert.doesNotMatch(publicAnalytics, new RegExp(`\\b${forbiddenKey}\\s*:`, "i"), `public activation analytics must not send ${forbiddenKey}`);
  }
  assert.match(publicAnalytics, /method: "email"/);
  assert.match(publicAnalytics, /method: "google"/);

  const workspaceAnalytics = read("components/workspace-activation-analytics.tsx");
  for (const forbiddenKey of ["run_id", "source_id", "pathname", "url", "prompt", "answer", "citation"]) {
    assert.doesNotMatch(workspaceAnalytics, new RegExp(`\\b${forbiddenKey}\\s*:`, "i"), `workspace activation analytics must not send ${forbiddenKey}`);
  }
});

test("workspace milestones exclude demo data and require real evidence surfaces", () => {
  const source = read("components/workspace-activation-analytics.tsx");
  assert.match(source, /if \(demo\) return/);
  assert.match(source, /\.answer-stack > article\.panel/);
  assert.match(source, /\.answer-citations a/);
  assert.match(source, /source_xray_viewed/);
  assert.match(source, /sessionStorage/);
});

test("reviewed opportunity milestone is emitted only when the review API creates one", () => {
  const source = read("components/source-review-form.tsx");
  assert.match(source, /result\.opportunity\?\.action === "created"\) captureProductEvent\("reviewed_opportunity_created"\)/);
  assert.doesNotMatch(source, /action === "refreshed"\) captureProductEvent\("reviewed_opportunity_created"\)/);
});

test("activation observers are mounted at public and authenticated boundaries", () => {
  const rootLayout = read("app/layout.tsx");
  const workspaceLayout = read("app/app/layout.tsx");
  assert.match(rootLayout, /<PublicActivationAnalytics \/>/);
  assert.match(workspaceLayout, /<WorkspaceActivationAnalytics demo=\{viewer\.mode === "demo"\} \/>/);
  assert.match(workspaceLayout, /<PostHogIdentity/);
});
