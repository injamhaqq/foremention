import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const heroPath = new URL("../components/goat-home-experience.tsx", import.meta.url);
const cssPath = new URL("../app/public-cinematic-home.css", import.meta.url);
const layoutPath = new URL("../app/layout.tsx", import.meta.url);

test("public homepage exposes the approved evidence-led cinematic hero", async () => {
  const source = await readFile(heroPath, "utf8");

  assert.match(source, /See where AI recommends your brand\./);
  assert.match(source, /Track recommendations, inspect supporting sources, and decide what to improve\./);
  assert.match(source, /href="#recommendation-record">Explore a sample/);
  assert.match(source, /href="\/contact">Request a pilot/);
  assert.match(source, /ILLUSTRATIVE SIGNAL MAP/);
  assert.match(source, /Question → answer → brands → sources/);
  assert.match(source, /Recommendation Record/);
  assert.match(source, /Opening this page does not trigger paid research or expose customer records/);
});

test("cinematic homepage keeps responsive and reduced-motion fallbacks", async () => {
  const css = await readFile(cssPath, "utf8");
  const layout = await readFile(layoutPath, "utf8");

  assert.match(layout, /public-cinematic-home\.css/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.fm-recommendation-graph__lines \{ display: none; \}/);
});

test("public hero remains a static sample rather than a live-provider surface", async () => {
  const source = await readFile(heroPath, "utf8");

  for (const forbidden of [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "PERPLEXITY_API_KEY",
    "fetch(",
    "/api/runs",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `homepage hero must not contain live provider trigger: ${forbidden}`,
    );
  }
});


test("public sample graph is progressively inspectable without inventing extra provider surfaces", async () => {
  const source = await readFile(heroPath, "utf8");
  const css = await readFile(cssPath, "utf8");

  assert.match(source, /useState\(""/);
  assert.match(source, /Choose the supported example measurement surface/);
  assert.match(source, /workers-ai-bing-rss/);
  assert.match(source, /Workers AI \+ Bing RSS grounded synthesis/);
  assert.match(source, /aria-pressed=\{selectedBrand === "competitor"\}/);
  assert.match(source, /aria-pressed=\{selectedEvidence === "source-01"\}/);
  assert.match(source, /does not invent a causal explanation/i);
  assert.match(css, /button\.fm-graph-node:disabled/);
  assert.match(css, /\.fm-graph-node\.is-selected/);
});
