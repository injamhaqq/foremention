import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("homepage explains the founder-led pilot without replacing the approved hero", async () => {
  const hero = await read("components/goat-home-experience.tsx");
  assert.match(hero, /See where AI recommends your brand\./);
  assert.match(hero, /Track recommendations, inspect supporting sources, and decide what to improve\./);
  assert.match(hero, /For B2B software marketing and growth teams/);
  for (const step of ["Five buyer questions", "Inspectable evidence", "One approved change to test"]) {
    assert.match(hero, new RegExp(step));
  }
  assert.match(hero, /className="fm-cinematic-hero__steps"/);
  assert.match(hero, /<ol className="fm-cinematic-hero__steps">/);
  assert.match(hero, /href="#sample-recommendation-graph">Explore a sample/);
  assert.match(hero, /href="\/contact">Request a pilot/);
  assert.match(hero, /The example uses Workers AI \+ Bing RSS grounded synthesis, not direct ChatGPT, Gemini, or Perplexity application monitoring/);
  assert.match(hero, /Opening this page does not trigger paid research or expose customer records/);
});

test("new scope summary keeps small-screen and accessible reading order", async () => {
  const [hero, styles, shell] = await Promise.all([
    read("components/goat-home-experience.tsx"),
    read("app/public-cinematic-home.css"),
    read("components/public-shell.tsx"),
  ]);
  assert.ok(hero.indexOf("fm-cinematic-hero__pilot") < hero.indexOf("fm-cinematic-hero__actions"));
  assert.match(styles, /\.fm-cinematic-hero__pilot\s*\{/);
  assert.match(styles, /\.fm-cinematic-hero__steps\s*\{/);
  assert.match(styles, /@media \(max-width: 620px\) \{[\s\S]*\.fm-cinematic-hero__steps \{ display: grid; gap: 8px; \}/);
  assert.match(styles, /\.fm-cinematic-hero__steps li:not\(:first-child\)::before/);
  assert.match(shell, /<summary aria-label="Site navigation"><Arrow \/><\/summary>/);
  assert.doesNotMatch(shell, /aria-label="Open navigation"/);
});

test("pilot clarification does not replace trusted routes or add runtime dependencies", async () => {
  const [packageJson, shell, hero] = await Promise.all([
    read("package.json"),
    read("components/public-shell.tsx"),
    read("components/goat-home-experience.tsx"),
  ]);
  const deps = JSON.parse(packageJson).dependencies;
  for (const candidate of ["@base-ui/react", "@radix-ui/react-dialog", "motion", "lucide-react"]) {
    assert.equal(Object.hasOwn(deps, candidate), false, "new runtime packages need a demonstrated interface problem");
  }
  assert.match(shell, /Register\. Prove\. Prepare\./);
  assert.match(hero, /href="\/methodology"/);
  assert.match(hero, /href="\/trust"/);
});
