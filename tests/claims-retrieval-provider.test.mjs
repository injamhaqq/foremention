// Claims track (FM-04): every public surface names Brave Search, the one
// retrieval provider production uses, and never presents Bing as the method.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_COLLECTION_SURFACE, LIVE_RETRIEVAL_PROVIDER, groundedCollectionLabel } from "../lib/public-claims.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

// Public pages, components, metadata sources, markdown mirrors and agent files.
const PUBLIC_SURFACES = [
  "app/methodology/page.tsx",
  "app/product/page.tsx",
  "app/use-cases/page.tsx",
  "app/page.tsx",
  "app/layout.tsx",
  "app/pricing/page.tsx",
  "app/privacy/page.tsx",
  "app/subprocessors/page.tsx",
  "app/dpa/page.tsx",
  "components/goat-home-experience.tsx",
  "components/illustrative-recommendation-graph.tsx",
  "lib/data.ts",
  "lib/source-map-generation.ts",
  "lib/seo.ts",
  "public/index.md",
  "public/methodology.md",
  "public/product.md",
  "public/use-cases.md",
  "public/llms.txt",
  "public/llms-full.txt",
  "public/sitemap.md",
  "public/AGENTS.md",
  "README.md",
];

const BING_AS_METHOD = /Bing Search RSS|Bing RSS|Bing Search\b(?! Console)/;

test("no public surface describes Bing as the retrieval provider", async () => {
  for (const path of PUBLIC_SURFACES) {
    const source = await text(path);
    assert.doesNotMatch(source, BING_AS_METHOD, `${path} still names Bing as the retrieval method`);
  }
});

test("methodology and product pages state Brave Search as the one retrieval provider", async () => {
  const methodology = await text("app/methodology/page.tsx");
  assert.match(methodology, /Web retrieval uses one provider: the \{LIVE_RETRIEVAL_PROVIDER\} API/);
  assert.match(methodology, /from "@\/lib\/public-claims"/);
  assert.match(await text("public/methodology.md"), /Web retrieval uses one provider: the \*\*Brave Search API\*\*/);
  const product = await text("app/product/page.tsx");
  assert.match(product, /Cloudflare Workers AI with Brave Search API retrieval and grounded/);
  assert.match(product, /independently retrieved Brave Search sources/);
  assert.match(await text("public/product.md"), /Cloudflare Workers AI \+ Brave Search grounded synthesis/);
});

test("llms.txt and llms-full.txt describe the Brave Search retrieval method", async () => {
  const llms = await text("public/llms.txt");
  assert.match(llms, /## Measurement method/);
  assert.match(llms, /one provider, the Brave Search API/);
  assert.match(llms, /does not monitor ChatGPT, Gemini, or Perplexity consumer apps/);
  const full = await text("public/llms-full.txt");
  assert.match(full, /Web retrieval uses one provider: the Brave Search API/);
});

test("the claim matches the runtime: Brave is used exclusively when its key is configured", async () => {
  const retrieval = await text("lib/free-web-retrieval.ts");
  assert.match(retrieval, /if \(braveSearchApiKey\(\)\) return "brave-search";/);
  assert.match(retrieval, /FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED === "1"/);
  assert.equal(LIVE_RETRIEVAL_PROVIDER, "Brave Search");
  assert.equal(LIVE_COLLECTION_SURFACE, "Cloudflare Workers AI + Brave Search");
});

test("public score and prompt-check label each result from the retrieval provider it recorded", async () => {
  assert.equal(groundedCollectionLabel("brave-search"), "Cloudflare Workers AI + Brave Search");
  assert.equal(groundedCollectionLabel(undefined), "Cloudflare Workers AI + Brave Search");
  // An authorized Bing record stays truthfully labelled instead of being relabelled Brave.
  assert.equal(groundedCollectionLabel("bing-rss"), "Cloudflare Workers AI + Bing Search RSS");
  const worker = await text("worker/index.ts");
  assert.equal((worker.match(/provider: groundedCollectionLabel\(grounded\.retrievalProvider\)/g) || []).length, 2);
  assert.doesNotMatch(worker, /provider: "Cloudflare Workers AI \+ Bing Search RSS"/);
});

test("subprocessors list Brave Search and Zoho Mail", async () => {
  const page = await text("app/subprocessors/page.tsx");
  assert.match(page, /name: "Brave Search"/);
  assert.match(page, /name: "Zoho Mail"/);
  assert.match(page, /one retrieval provider/);
});
