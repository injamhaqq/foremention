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
  for (const label of ["Product", "Use cases", "Pricing", "Research", "Trust", "Sign in", "Request a pilot"]) {
    assert.ok(shell.includes(label), "Missing public navigation label: " + label);
  }
  assert.ok(shell.includes('["/pricing", "Pricing"]'));
  assert.ok(shell.includes('["/insights", "Research"]'));
  assert.ok(shell.includes('>Glossary</Link>'));
});

test("homepage pilot CTAs use the approved label and the sample action stays distinct", async () => {
  const home = await text("components/goat-home-experience.tsx");
  assert.ok(!home.includes("Apply as a Design Partner"));
  assert.ok(home.includes("Request a pilot"));
  assert.ok(home.includes("Explore a sample"));
  assert.ok(home.includes("Inspect evidence"));
});
