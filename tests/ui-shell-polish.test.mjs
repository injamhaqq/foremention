import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navigation = await readFile(new URL("../components/workspace-navigation.tsx", import.meta.url), "utf8");
const polish = await readFile(new URL("../app/product-polish.css", import.meta.url), "utf8");
const analytics = await readFile(new URL("../components/contentsquare-analytics.tsx", import.meta.url), "utf8");
const publicShell = await readFile(new URL("../components/public-shell.tsx", import.meta.url), "utf8");

test("desktop workspace navigation keeps the long tool list in its own scroll region", () => {
  assert.match(navigation, /className="app-sidebar__navigation"/);
  assert.match(navigation, /className="app-sidebar__footer"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--primary"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--workspace"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--advanced"/);
  assert.match(navigation, /<small>\{advancedNav\.length\} tools<\/small>/);
  assert.match(polish, /\.app-sidebar\s*\{\s*overflow:\s*hidden;/);
  assert.match(polish, /\.app-sidebar__navigation\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(polish, /\.app-sidebar__footer\s*\{[^}]*flex:\s*0 0 auto;/s);
});

test("optional experience analytics stays off by default without an automatic overlay", () => {
  assert.match(analytics, /if \(consent !== "accepted" \|\| !tagUrl/);
  assert.match(analytics, /if \(consent !== "accepted" \|\| !clarityProjectId/);
  assert.doesNotMatch(analytics, /className="analytics-consent"/);
  assert.doesNotMatch(polish, /\.analytics-consent/);
  assert.match(analytics, /export function ExperienceAnalyticsPreferences/);
  assert.match(publicShell, /<ExperienceAnalyticsPreferences \/>/);
  assert.match(analytics, /Optional Microsoft Clarity and Contentsquare analytics stay off unless you allow them/);
});
