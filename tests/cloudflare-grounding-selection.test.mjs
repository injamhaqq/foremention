import assert from "node:assert/strict";
import test from "node:test";
import { selectRetrievedCitations } from "../lib/providers/cloudflare.ts";

const citations = [
  { url: "https://example.com/a", title: "A" },
  { url: "https://example.org/b", title: "B" },
];

test("Cloudflare grounding respects valid model-selected retrieval indexes", () => {
  assert.deepEqual(
    selectRetrievedCitations("Supported answer.\nSOURCES: [2]", citations),
    {
      answer: "Supported answer.",
      citations: [citations[1]],
      citationSelection: "model-selected",
    },
  );
});

test("Cloudflare grounding preserves the bounded retrieved evidence set when source markers are omitted", () => {
  assert.deepEqual(
    selectRetrievedCitations("Supported answer without a source footer.", citations),
    {
      answer: "Supported answer without a source footer.",
      citations,
      citationSelection: "retrieved-evidence-set",
    },
  );
});

test("Cloudflare grounding never promotes answer-text URLs into citations", () => {
  const result = selectRetrievedCitations("See https://untrusted.example/fabricated for details.", citations);
  assert.deepEqual(result.citations, citations);
  assert.equal(result.citations.some((citation) => citation.url.includes("untrusted.example")), false);
});

test("Cloudflare grounding still fails closed if retrieval produced no citation evidence", () => {
  assert.throws(
    () => selectRetrievedCitations("An answer exists.", []),
    /retriever returned no citation evidence/i,
  );
});
