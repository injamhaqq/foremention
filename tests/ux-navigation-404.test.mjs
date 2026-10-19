// Fix track "ux" (2026-10-19), item 6: simpler app navigation and proper 404s.
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { PRIMARY_WORKSPACE_DESTINATIONS, primaryDestinationForPath } from "../lib/workspace-nav-section.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every signed-in page highlights exactly one of the eight locked destinations", () => {
  const cases = [
    ["/app", "/app"], ["/app/", "/app"], ["/app/onboarding", "/app"],
    ["/app/prompts", "/app/prompts"],
    ["/app/runs", "/app/runs"], ["/app/runs/abc", "/app/runs"], ["/app/runs/abc/print", "/app/runs"], ["/app/runs/compare", "/app/runs"],
    ["/app/change-specifications/x", "/app/runs"],
    ["/app/source-map", "/app/source-map"], ["/app/sources/x", "/app/source-map"], ["/app/evidence", "/app/source-map"],
    ["/app/opportunities", "/app/opportunities"], ["/app/placements", "/app/opportunities"], ["/app/resolutions", "/app/opportunities"],
    ["/app/analytics", "/app/analytics"], ["/app/outcomes/print", "/app/analytics"], ["/app/intelligence", "/app/analytics"], ["/app/decision-lab", "/app/analytics"],
    ["/app/settings", "/app/settings"], ["/app/settings/customer-success", "/app/settings"], ["/app/team", "/app/settings"], ["/app/support", "/app/settings"],
    ["/app/tools", "/app/tools"], ["/app/search", "/app/tools"],
    // Specialist tools indexed from All tools.
    ["/app/alerts", "/app/tools"], ["/app/competitors", "/app/tools"], ["/app/passport", "/app/tools"], ["/app/agents", "/app/tools"],
    ["/app/does-not-exist", "/app/tools"],
  ];
  for (const [path, expected] of cases) assert.equal(primaryDestinationForPath(path), expected, path);
  // Segment matching: no accidental prefix collisions.
  assert.equal(primaryDestinationForPath("/app/runsx"), "/app/tools");
  assert.equal(primaryDestinationForPath("/app/settingsevil"), "/app/tools");
  for (const outside of ["/", "/apple", "/pricing", "/login", null, undefined]) assert.equal(primaryDestinationForPath(outside), null, String(outside));
  assert.equal(PRIMARY_WORKSPACE_DESTINATIONS.length, 8);
});

test("navigation keeps the locked eight-item IA and uses one current-state rule", async () => {
  const nav = await text("components/workspace-navigation.tsx");
  const primary = nav.slice(nav.indexOf("const primaryNav"), nav.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"));
  const hrefs = [...primary.matchAll(/\["(\/app[^"]*)", "[^"]+"\]/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, [...PRIMARY_WORKSPACE_DESTINATIONS], "sidebar destinations and section map stay in lockstep");
  assert.match(nav, /return primaryDestinationForPath\(pathname\) === href;/);
  const contextual = nav.slice(nav.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"), nav.indexOf("] as const;", nav.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES")));
  assert.doesNotMatch(contextual, /"\/app\/opportunities"/, "a primary destination is not repeated as a contextual tool");
});

test("unknown /app URLs render a signed-in 404 inside the workspace shell", async () => {
  await access(new URL("../app/app/not-found.tsx", import.meta.url));
  const [appNotFound, catchAll] = await Promise.all([text("app/app/not-found.tsx"), text("app/app/[...missing]/page.tsx")]);
  assert.match(catchAll, /notFound\(\);/);
  assert.doesNotMatch(appNotFound, /PublicShell/, "no marketing header/footer nested inside the app shell");
  assert.match(appNotFound, /robots: \{ index: false, follow: false \}/);
  assert.match(appNotFound, /404 · Page not found/);
  for (const href of ["/app", "/app/runs", "/app/tools", "/app/search"]) assert.ok(appNotFound.includes(`href="${href}"`), href);
  assert.match(appNotFound, /supportMailtoHref/);
});

test("the public 404 explains itself and offers real recovery links", async () => {
  const notFound = await text("app/not-found.tsx");
  assert.match(notFound, /PublicShell/);
  assert.match(notFound, /robots: \{ index: false, follow: false \}/);
  assert.match(notFound, /404 · Page not found/);
  assert.doesNotMatch(notFound, /source not found/, "no product jargon on a generic 404");
  for (const href of ["/", "/product", "/contact", "/login"]) assert.ok(notFound.includes(`href="${href}"`), href);
});
