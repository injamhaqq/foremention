import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navigation = await readFile(new URL("../components/workspace-navigation.tsx", import.meta.url), "utf8");
const polish = await readFile(new URL("../app/product-polish.css", import.meta.url), "utf8");
const analytics = await readFile(new URL("../components/contentsquare-analytics.tsx", import.meta.url), "utf8");
const publicShell = await readFile(new URL("../components/public-shell.tsx", import.meta.url), "utf8");

test("desktop workspace navigation keeps only the five canonical objects in the rendered sidebar", () => {
  assert.match(navigation, /className="app-sidebar__navigation"/);
  assert.match(navigation, /className="app-sidebar__footer"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--primary"/);
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(navigation, new RegExp(label));
  assert.doesNotMatch(navigation, /className="sidebar-nav sidebar-nav--workspace"/);
  assert.doesNotMatch(navigation, /className="sidebar-nav sidebar-nav--advanced"/);
  assert.doesNotMatch(navigation, /<details className="sidebar-advanced">/);
  assert.match(navigation, /CONTEXTUAL_WORKSPACE_ROUTES/);
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
  assert.match(analytics, /Microsoft Clarity/);
  assert.match(analytics, /Contentsquare/);
  assert.match(analytics, /This preference controls optional experience analytics only/);
});