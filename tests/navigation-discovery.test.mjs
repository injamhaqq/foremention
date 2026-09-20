import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public primary navigation stays focused while Explore exposes the broader site", async () => {
  const [shell, explore] = await Promise.all([
    text("components/public-shell.tsx"),
    text("app/explore/page.tsx"),
  ]);

  for (const pair of [
    '["/product", "Product"]',
    '["/#how-it-works", "How it works"]',
    '["/methodology", "Methodology"]',
    '["/trust", "Trust"]',
  ]) assert.ok(shell.includes(pair), "missing canonical public navigation item: " + pair);

  assert.ok(shell.includes('href="/explore">Explore Foremention</Link>'));
  assert.doesNotMatch(shell, /\["\/pricing", "Pricing"\]/);
  assert.doesNotMatch(shell, /href="\/(?:standards|honesty)"/);

  for (const route of ["/product", "/pricing", "/score", "/prompt-check", "/sample-report", "/roi", "/methodology", "/source-map", "/trust", "/privacy", "/subprocessors", "/terms", "/recommendation-intelligence", "/ai-mediated-buying", "/monitoring-vs-execution", "/insights", "/glossary", "/teardowns", "/about", "/partners", "/api-docs/webhooks", "/source-gap", "/contact", "/compare"]) {
    assert.ok(explore.includes(route), "missing Explore destination: " + route);
  }
});

test("workspace primary navigation stays five-object while search exposes supporting tools", async () => {
  const [navigation, search] = await Promise.all([
    text("components/workspace-navigation.tsx"),
    text("app/app/search/page.tsx"),
  ]);

  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) {
    assert.ok(navigation.includes('"' + label + '"'), "missing canonical workspace object: " + label);
  }
  assert.doesNotMatch(navigation, /sidebar-advanced|sidebar-nav--workspace|Workspace tools|Advanced workspace tools/);
  assert.ok(navigation.includes('href="/app/search"'));
  assert.ok(navigation.includes("Search workspace"));

  for (const route of ["/app/alerts", "/app/competitors", "/app/opportunities", "/app/placements", "/app/resolutions", "/app/outcomes", "/app/intelligence", "/app/decision-lab", "/app/evidence", "/app/passport", "/app/agents", "/app/team", "/app/settings#integrations", "/app/support"]) {
    assert.ok(search.includes(route), "missing workspace search destination: " + route);
  }
  assert.ok(search.includes("Jump to a workspace tool"));
});
