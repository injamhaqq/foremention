import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("workspace tools directory makes every major capability discoverable", async () => {
  const page = await text("app/app/tools/page.tsx");
  for (const href of [
    "/app/prompts",
    "/app/runs",
    "/app/source-map",
    "/app/evidence",
    "/app/alerts",
    "/app/opportunities",
    "/app/competitors",
    "/app/analytics",
    "/app/decision-lab",
    "/app/intelligence",
    "/app/placements",
    "/app/resolutions",
    "/app/outcomes",
    "/app/passport",
    "/app/agents",
    "/app/team",
    "/app/settings#integrations",
    "/app/settings",
    "/app/search",
    "/app/support",
  ]) assert.ok(page.includes(href), "Missing tools directory link: " + href);
});

test("public navigation exposes product, pricing, research, trust, and sign in", async () => {
  const shell = await text("components/public-shell.tsx");
  for (const label of ["Product", "How it works", "Pricing", "Research", "Trust", "Sign in"]) {
    assert.ok(shell.includes(label), "Missing public navigation label: " + label);
  }
  assert.ok(shell.includes('["/pricing", "Pricing"]'));
  assert.ok(shell.includes('["/insights", "Research"]'));
  assert.ok(shell.includes('>Glossary</Link>'));
});

test("design-partner CTAs use one consistent label and the example record CTA is distinct", async () => {
  const home = await text("components/goat-home-experience.tsx");
  assert.ok(!home.includes("Apply as a Design Partner"));
  assert.ok(home.includes("Apply as Design Partner"));
  assert.ok(home.includes("See example Recommendation Record"));
});
