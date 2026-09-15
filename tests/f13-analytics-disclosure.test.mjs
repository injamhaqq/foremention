import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public analytics disclosure matches the production PostHog region", async () => {
  const [analytics, privacy, subprocessors] = await Promise.all([
    text("lib/product-analytics.ts"),
    text("app/privacy/page.tsx"),
    text("app/subprocessors/page.tsx"),
  ]);
  assert.match(analytics, /PRODUCTION_POSTHOG_HOST = "https:\/\/us\.i\.posthog\.com"/);
  assert.doesNotMatch(privacy, /PostHog EU/);
  assert.doesNotMatch(subprocessors, /PostHog EU/);
  assert.match(privacy, /PostHog/);
  assert.match(subprocessors, /name: "PostHog"/);
});

test("disclosure preserves the actual privacy boundaries configured in product analytics", async () => {
  const [analytics, privacy, subprocessors] = await Promise.all([
    text("lib/product-analytics.ts"),
    text("app/privacy/page.tsx"),
    text("app/subprocessors/page.tsx"),
  ]);
  for (const contract of [/autocapture: false/, /disable_session_recording: true/, /capture_pageview: false/]) {
    assert.match(analytics, contract);
  }

  for (const disclosure of [privacy, subprocessors]) {
    assert.match(disclosure, /session replay[^.]{0,80}(?:disabled|are disabled)/i,
      "disclosure must state that PostHog session replay is disabled");
    assert.match(disclosure, /(?:click\/form autocapture|automatic click or form capture)[^.]{0,120}(?:disabled|are disabled)/i,
      "disclosure must state that PostHog click/form autocapture is disabled");
  }
});
