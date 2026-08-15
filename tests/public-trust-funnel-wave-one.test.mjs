import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("standards uses a canonical public route and preserves legacy honesty links", async () => {
  const [standards, honesty, shell, sitemap] = await Promise.all([
    text("app/standards/page.tsx"),
    text("app/honesty/page.tsx"),
    text("components/public-shell.tsx"),
    text("app/sitemap.ts"),
  ]);

  assert.match(standards, /path:\s*["']\/standards["']/);
  assert.match(standards, /AI Visibility Evidence and Ethics Standards/);
  assert.match(honesty, /permanentRedirect\(["']\/standards["']\)/);
  assert.match(shell, /["']\/standards["']/);
  assert.doesNotMatch(shell, /["']\/honesty["']/);
  assert.match(sitemap, /["']\/standards["']/);
});

test("free-beta structured data does not advertise inactive paid offers", async () => {
  const layout = await text("app/layout.tsx");

  assert.doesNotMatch(layout, /Foremention Core[\s\S]{0,160}price:\s*["']149["']/);
  assert.doesNotMatch(layout, /Foremention Signal[\s\S]{0,160}price:\s*["']499["']/);
  assert.doesNotMatch(layout, /offers:\s*\[[\s\S]{0,500}price:\s*["'](?:149|499)["']/);
});

test("global footer is concise and exposes trust destinations by their real names", async () => {
  const shell = await text("components/public-shell.tsx");

  assert.match(shell, />Product</);
  assert.match(shell, />Company</);
  assert.match(shell, />Legal \/ Trust</);
  assert.match(shell, /href=["']\/subprocessors["'][^>]*>Subprocessors</);
  assert.doesNotMatch(shell, />Service providers</);
  assert.doesNotMatch(shell, /Live Source Map/);
  assert.doesNotMatch(shell, /ROI scenario/);
  assert.doesNotMatch(shell, /AI visibility guide/);
});

test("optional experience analytics uses a compact accessible settings dialog", async () => {
  const analytics = await text("components/contentsquare-analytics.tsx");

  assert.match(analytics, /Analytics settings/);
  assert.match(analytics, /role=["']dialog["']/);
  assert.match(analytics, /aria-modal=["']true["']/);
  assert.match(analytics, /aria-labelledby=/);
  assert.match(analytics, /Keep off/);
  assert.match(analytics, /Allow analytics/);
  assert.match(analytics, /foremention:experience-analytics-consent/);
  assert.match(analytics, /previous === ["']accepted["'] && next === ["']declined["']/);
  assert.doesNotMatch(analytics, /<details className=["']footer-analytics-preferences["']/);
});
