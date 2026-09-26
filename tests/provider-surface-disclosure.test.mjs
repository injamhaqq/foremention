import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public product and methodology HTML explicitly identify free-only measurement, not native consumer surfaces", async () => {
  const [product, method] = await Promise.all([read("app/product/page.tsx"), read("app/methodology/page.tsx")]);
  for (const page of [product, method]) {
    assert.match(page, /Cloudflare Workers AI/);
    assert.match(page, /Bing Search RSS/);
    assert.match(page, /grounded\s+synthesis/);
    assert.match(page, /not\s+(?:a\s+native\s+|directly\s+monitor\s+)?ChatGPT|not directly monitor ChatGPT|not a\s+native ChatGPT/i);
    assert.match(page, /Gemini/);
    assert.match(page, /Perplexity/);
    assert.match(page, /consumer-app/);
  }
  assert.match(product, /Know exactly which AI surface was observed/);
  assert.match(method, /A provider name does not prove consumer-app coverage/);
  assert.doesNotMatch(product, /Foremention starts with the AI answers buyers may see/);
});

test("public Markdown mirrors disclose the exact same provider-surface boundaries", async () => {
  const [product, method] = await Promise.all([read("public/product.md"), read("public/methodology.md")]);
  for (const page of [product, method]) {
    assert.match(page, /Cloudflare Workers AI/);
    assert.match(page, /Bing Search RSS/);
    assert.match(page, /grounded synthesis/);
    assert.match(page, /consumer-app/);
    assert.match(page, /Gemini/);
    assert.match(page, /Perplexity/);
    assert.match(page, /last_updated:\s*"2026-09-26"/);
  }
  assert.match(product, /not\*\* direct monitoring of ChatGPT/i);
  assert.match(method, /not a native ChatGPT/i);
});

test("claims track the configured free-only provider rather than treating configured adapters as verified", async () => {
  const [mode, provider, optionList, readme] = await Promise.all([
    read("lib/free-provider-mode.ts"),
    read("lib/providers/cloudflare.ts"),
    read("lib/data.ts"),
    read("docs/PROVIDER-SURFACE-TRUTH.md"),
  ]);
  assert.match(mode, /FREE_ONLY_COLLECTION_PROVIDER[^\n]*"cloudflare"/);
  assert.match(mode, /FOREMENTION_FREE_ONLY_MODE !== "0"/);
  assert.match(provider, /retrieveFreeWebEvidence/);
  assert.match(provider, /source_numbers/);
  assert.match(optionList, /label: "Cloudflare Workers AI \+ Bing Search RSS"/);
  for (const phrase of ["direct provider API", "consumer application", "20", "10", "citation"]) {
    assert.ok(readme.includes(phrase), `missing provider-surface qualification boundary: ${phrase}`);
  }
});
