import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const privacyUrl = new URL("../app/privacy/page.tsx", import.meta.url);
const subprocessorsUrl = new URL("../app/subprocessors/page.tsx", import.meta.url);
const analyticsUrl = new URL("../lib/product-analytics.ts", import.meta.url);
const componentUrl = new URL("../components/posthog-analytics.tsx", import.meta.url);

test("public analytics disclosure matches production PostHog behavior", async () => {
  const [privacy, subprocessors, analytics, component] = await Promise.all([
    readFile(privacyUrl, "utf8"),
    readFile(subprocessorsUrl, "utf8"),
    readFile(analyticsUrl, "utf8"),
    readFile(componentUrl, "utf8"),
  ]);

  assert.match(component, /captureProductEvent\("\$pageview"/);
  assert.match(analytics, /persistence:\s*"localStorage\+cookie"/);

  for (const disclosure of [privacy, subprocessors]) {
    assert.match(disclosure, /manual(?:ly)?[^.]{0,120}(?:route|page)[^.]{0,120}(?:view|viewed|pageview)/i,
      "disclosure must explain the explicit route/page-view event rather than implying milestones only");
    assert.match(disclosure, /localStorage|local storage/i,
      "disclosure must state that PostHog uses browser local storage");
    assert.match(disclosure, /cookie/i,
      "disclosure must state that PostHog uses a cookie");
  }

  assert.ok(
    privacy.includes("The Analytics settings link in the footer controls the optional Microsoft Clarity and Contentsquare experience-analytics choice;"),
    "privacy notice must name the optional tools controlled by Analytics settings",
  );
  assert.ok(
    privacy.includes("it does not toggle the separate limited PostHog product analytics described above."),
    "privacy notice must distinguish optional experience analytics from limited PostHog product analytics",
  );
});
