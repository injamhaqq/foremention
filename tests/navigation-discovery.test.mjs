import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public primary navigation exposes pricing and research while Explore preserves the broader directory", async () => {
  const [shell, explore] = await Promise.all([
    text("components/public-shell.tsx"),
    text("app/explore/page.tsx"),
  ]);

  for (const pair of [
    '["/product", "Product"]',
    '["/#how-it-works", "How it works"]',
    '["/pricing", "Pricing"]',
    '["/insights", "Research"]',
    '["/trust", "Trust"]',
  ]) assert.ok(shell.includes(pair), "missing public navigation item: " + pair);

  assert.ok(shell.includes('href="/explore">Explore Foremention</Link>'));
  assert.ok(shell.includes('href="/login">Sign in</Link>'));
  assert.ok(shell.includes("Apply as Design Partner"));
  assert.doesNotMatch(shell, /href="\/(?:standards|honesty)"/);

  for (const route of ["/product", "/pricing", "/score", "/prompt-check", "/sample-report", "/roi", "/methodology", "/source-map", "/trust", "/privacy", "/subprocessors", "/terms", "/recommendation-intelligence", "/ai-mediated-buying", "/monitoring-vs-execution", "/insights", "/glossary", "/teardowns", "/about", "/partners", "/api-docs/webhooks", "/source-gap", "/contact", "/compare"]) {
    assert.ok(explore.includes(route), "missing Explore destination: " + route);
  }
});

test("workspace core navigation stays concise while All tools and search expose supporting capabilities", async () => {
  const [navigation, search, tools] = await Promise.all([
    text("components/workspace-navigation.tsx"),
    text("app/app/search/page.tsx"),
    text("app/app/tools/page.tsx"),
  ]);

  const primary = navigation.slice(navigation.indexOf("const primaryNav"), navigation.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"));
  for (const label of ["Overview", "Questions", "Records", "Evidence", "Opportunities", "Comparisons", "All tools", "Settings"]) {
    assert.ok(primary.includes('"' + label + '"'), "missing core workspace destination: " + label);
  }
  assert.doesNotMatch(navigation, /sidebar-advanced|sidebar-nav--workspace|Workspace tools|Advanced workspace tools/);
  assert.ok(navigation.includes('href="/app/search"'));
  assert.ok(navigation.includes("Search workspace"));

  for (const route of ["/app/alerts", "/app/competitors", "/app/opportunities", "/app/placements", "/app/resolutions", "/app/outcomes", "/app/intelligence", "/app/decision-lab", "/app/evidence", "/app/passport", "/app/agents", "/app/team", "/app/settings#integrations", "/app/support"]) {
    assert.ok(search.includes(route), "missing workspace search destination: " + route);
    assert.ok(tools.includes(route), "missing All tools destination: " + route);
  }
  for (const route of ["/app/prompts", "/app/runs", "/app/source-map", "/app/analytics", "/app/settings", "/app/search"]) {
    assert.ok(tools.includes(route), "missing core/supporting All tools destination: " + route);
  }
  assert.ok(search.includes("Jump to a workspace tool"));
  assert.ok(tools.includes("Everything in Foremention, in one place."));
});
