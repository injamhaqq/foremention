import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public navigation exposes product discovery, free tools, pricing, trust, and a complete explore hub", async () => {
  const [shell, explore] = await Promise.all([
    text("components/public-shell.tsx"),
    text("app/explore/page.tsx"),
  ]);
  for (const href of ["/product", "/explore#free-tools", "/pricing", "/explore", "/trust", "/score", "/prompt-check"]) {
    assert.ok((shell + explore).includes(href), "missing public navigation route: " + href);
  }
  assert.ok(shell.includes('aria-label="Foremention home"'));
  assert.ok(explore.includes("Find the right page without hunting for it."));
  for (const section of ["start", "free-tools", "evidence", "learn", "company"]) {
    assert.ok(explore.includes('id: "' + section + '"'), "missing explore directory group: " + section);
  }
});

test("workspace keeps the five canonical tabs while exposing grouped secondary tools on desktop and mobile", async () => {
  const nav = await text("components/workspace-navigation.tsx");
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) {
    assert.ok(nav.includes('"' + label + '"'), "missing canonical workspace tab: " + label);
  }
  for (const route of ["/app/alerts", "/app/competitors", "/app/source-map", "/app/evidence", "/app/intelligence", "/app/opportunities", "/app/change-specifications", "/app/placements", "/app/resolutions", "/app/outcomes", "/app/decision-lab", "/app/team", "/app/support", "/app/passport", "/app/agents"]) {
    assert.ok(nav.includes(route), "missing discoverable workspace route: " + route);
  }
  assert.ok(nav.includes("Explore workspace"));
  assert.ok(nav.includes("WorkspaceMobileNavigation"));
  assert.ok(nav.includes('href.split("#")'));
});
