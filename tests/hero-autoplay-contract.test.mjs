// Contract for the self-playing homepage sample.
//
// The hero sample is illustrative, so autoplay must never invent a provider
// surface, a question, or a causal claim. It may only cycle the states a
// visitor can already reach by hand, it must stop on any interaction, and it
// must not animate for reduced-motion visitors.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const graph = await readFile(new URL("../components/illustrative-recommendation-graph.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/public-cinematic-home.css", import.meta.url), "utf8");

test("the sample autoplays through existing states only", () => {
  assert.match(graph, /useEffect\(/);
  assert.match(graph, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  // Autoplay reuses the same state setters a click uses.
  assert.match(graph, /setSampleSurface\("workers-ai-bing-rss"\)/);
  assert.match(graph, /setSelectedBrand\("competitor"\)/);
  assert.match(graph, /setSelectedEvidence\("source-01"\)/);
  // No invented provider surfaces or questions.
  assert.doesNotMatch(graph, /OPENAI_API_KEY|GEMINI_API_KEY|PERPLEXITY_API_KEY|fetch\(|\/api\/runs/);
});

test("any visitor interaction stops autoplay", () => {
  const stops = graph.match(/stopAuto\(\)/g) || [];
  // select + two brands + two sources
  assert.ok(stops.length >= 5, `expected every control to stop autoplay, found ${stops.length}`);
  assert.match(graph, /onClick=\{stopAuto\}/);
  assert.match(graph, /is-autoplaying/);
});

test("reduced-motion visitors see the answered state, not motion", () => {
  const effect = graph.slice(graph.indexOf("useEffect("), graph.indexOf("}, []);"));
  const reduceBranch = effect.slice(0, effect.indexOf("const steps"));
  assert.match(reduceBranch, /reduceMotion/);
  assert.match(reduceBranch, /setSampleSurface\("workers-ai-bing-rss"\)/);
  assert.doesNotMatch(reduceBranch, /steps|tick/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("autoplay dimming is scoped so the buyer question stays legible", () => {
  assert.match(css, /\.fm-recommendation-graph\.is-autoplaying \.fm-graph-node:not\(\.is-selected\):not\(\.fm-graph-node--question\)/);
});
