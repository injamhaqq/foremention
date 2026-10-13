import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("homepage keeps the actual free-only collection surface explicit without implying consumer-app equivalence", async () => {
  const hero = await read("components/goat-home-experience.tsx");
  assert.match(hero, /Current free-only live collection uses Cloudflare Workers AI with independently retrieved Bing Search RSS sources and grounded synthesis/);
  assert.match(hero, /not direct monitoring of ChatGPT, Gemini, or Perplexity consumer applications/);
  assert.match(hero, /does not control an AI provider&apos;s ranking/);
  assert.match(hero, /Opening this page does not trigger paid research or expose customer records/);
  assert.match(hero, /href="\/contact"/);
});

test("index markdown stays consistent with homepage, method and exact provider runtime", async () => {
  const [rootMd, method, policy] = await Promise.all([
    read("public/index.md"), read("public/methodology.md"), read("lib/free-provider-mode.ts"),
  ]);
  assert.match(rootMd, /last_updated: "2026-10-05"/);
  assert.match(rootMd, /Cloudflare Workers AI/);
  assert.match(rootMd, /Bing Search RSS/);
  assert.match(rootMd, /does \*\*not\*\* directly monitor ChatGPT, Gemini, or Perplexity consumer-app responses/);
  assert.match(rootMd, /\[measurement methodology\]\(https:\/\/foremention\.com\/methodology\)/);
  assert.match(method, /Bing Search RSS/);
  assert.match(policy, /FREE_ONLY_COLLECTION_PROVIDER[^\n]*"cloudflare"/);
  assert.match(policy, /FOREMENTION_FREE_ONLY_MODE !== "0"/);
});
