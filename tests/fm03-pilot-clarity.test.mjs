import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("FM-03 hero communicates the actual buyer and founder-led pilot scope", async () => {
  const hero = await read("../components/goat-home-experience.tsx");
  assert.match(hero, /See where AI recommends your brand\./);
  assert.match(hero, /For B2B software marketing and growth teams/);
  assert.match(hero, /Five buyer questions/);
  assert.match(hero, /Inspectable evidence/);
  assert.match(hero, /One approved change to test/);
  assert.match(hero, /Workers AI \+ Bing RSS grounded synthesis, not direct ChatGPT, Gemini, or Perplexity application monitoring/);
  assert.match(hero, /href="#sample-recommendation-graph">Explore a sample/);
  assert.match(hero, /href="\/contact">Request a pilot/);
  assert.doesNotMatch(hero, /(?:OPENAI_API_KEY|GEMINI_API_KEY|PERPLEXITY_API_KEY)/);
});

test("FM-03 responsive treatment remains dependency-free and retains identity", async () => {
  const [css, shell, manifest] = await Promise.all([
    read("../app/public-cinematic-home.css"),
    read("../components/public-shell.tsx"),
    read("../package.json"),
  ]);
  assert.match(css, /\.fm-cinematic-hero__pilot\s*\{/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.fm-cinematic-hero__steps/);
  assert.match(shell, /aria-label="Site navigation"/);
  assert.match(shell, /<Wordmark \/>/);
  assert.match(shell, /Register\. Prove\. Prepare\./);
  for (const dependency of ["@base-ui-components/react", "@radix-ui/react-dialog", "framer-motion", "lucide-react"]) {
    assert.equal(Object.hasOwn(JSON.parse(manifest).dependencies, dependency), false);
  }
});
