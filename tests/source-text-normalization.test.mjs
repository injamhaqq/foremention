import assert from "node:assert/strict";
import test from "node:test";

const inspection = await import("../lib/source-inspection.ts");

const resolver = async () => ["93.184.216.34"];

test("source page text removes navigation, aside, and footer boilerplate without changing fingerprint input", async () => {
  const body = `<html><body><nav>Menu navigation noise</nav><main><h1>Core evidence</h1><p>Exact source observation remains.</p></main><aside>Sidebar noise</aside><footer>Footer noise</footer></body></html>`;
  const result = await inspection.inspectSourceUrl("https://example.com/source", {
    fetcher: async () => new Response(body, { headers: { "content-type": "text/html" } }),
    resolver,
    includePageText: true,
    maxExtractedTextChars: 1000,
    now: () => new Date("2026-08-14T00:00:00.000Z"),
  });

  assert.equal(result.access, "open");
  assert.match(result.pageText, /Core evidence/);
  assert.match(result.pageText, /Exact source observation remains/);
  assert.doesNotMatch(result.pageText, /Menu navigation noise/);
  assert.doesNotMatch(result.pageText, /Sidebar noise/);
  assert.doesNotMatch(result.pageText, /Footer noise/);

  // This exact fingerprint was produced by the pre-normalization full visible-text path.
  // Page-text cleanup must not create a one-time false Change Graph movement.
  assert.equal(result.contentLength, 96);
  assert.equal(result.contentSignature, "904c16f0");
});

test("plain-text sources keep their complete bounded text because HTML boilerplate semantics do not apply", async () => {
  const result = await inspection.inspectSourceUrl("https://example.com/plain", {
    fetcher: async () => new Response("Navigation words are legitimate plain text. Core evidence remains.", { headers: { "content-type": "text/plain" } }),
    resolver,
    includePageText: true,
    maxExtractedTextChars: 1000,
  });

  assert.equal(result.pageText, "Navigation words are legitimate plain text. Core evidence remains.");
  assert.equal(result.pageTitle, null);
  assert.equal(result.pageDescription, null);
});
