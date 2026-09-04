import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildScrapeGraphResearchRequest,
  extractScrapeGraphResearchFacts,
} from "../lib/acquisition-research-scrapegraph-contract.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const retrievedAt = "2026-09-04T10:00:00.000Z";

test("builds a bounded company-only research request", () => {
  const request = buildScrapeGraphResearchRequest({
    companyName: "Example",
    domain: "example.com",
    maxResults: 3,
  });
  assert.equal(request.numResults, 3);
  assert.match(request.query, /Example/);
  assert.match(request.query, /example\.com/);
  assert.match(request.prompt, /directly supported/i);
  assert.match(request.prompt, /sourceUrl/i);
  assert.equal(request.schema.properties.facts.type, "array");
});

test("accepts only facts whose sourceUrl appears in returned search results", () => {
  const payload = {
    status: "success",
    data: {
      results: [
        { url: "https://example.com/blog/ai-search" },
        { url: "https://news.example.org/example-launch" },
      ],
      json_data: {
        facts: [
          {
            key: "ai_search_motion",
            value: "Example published an AI-search initiative",
            sourceUrl: "https://example.com/blog/ai-search",
            confidence: 94,
          },
          {
            key: "recent_trigger",
            value: "Example launched a new product this quarter",
            sourceUrl: "https://news.example.org/example-launch",
            confidence: 88,
          },
        ],
      },
    },
  };

  const facts = extractScrapeGraphResearchFacts(payload, retrievedAt);
  assert.equal(facts.length, 2);
  assert.equal(facts[0].retrievedAt, retrievedAt);
});

test("fails closed when extracted fact cites a URL the search response did not return", () => {
  const payload = {
    status: "success",
    data: {
      results: [{ url: "https://example.com/about" }],
      json: {
        facts: [
          {
            key: "buyer_question",
            value: "Which vendor should buyers choose?",
            sourceUrl: "https://fabricated.example.net/source",
            confidence: 90,
          },
        ],
      },
    },
  };

  assert.throws(
    () => extractScrapeGraphResearchFacts(payload, retrievedAt),
    /ACQUISITION_RESEARCH_PROVIDER_SOURCE_MISMATCH/,
  );
});

test("runtime adapter keeps ScrapeGraph credentials server-side", async () => {
  const source = await text("lib/acquisition-research-scrapegraph.ts");
  assert.match(source, /cloudflare:workers/);
  assert.match(source, /SGAI_API_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SGAI|localStorage|document\./);
});
