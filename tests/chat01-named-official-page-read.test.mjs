// Chat 01: bounded read of the one exact official page a buyer names.
// Offline: fetch is stubbed; no network.
import assert from "node:assert/strict";
import test from "node:test";
import {
  extractScopedPageFacts,
  readScopedOfficialPage,
  retrieveFreeWebEvidence,
  sourceDomainScopeFromPrompt,
} from "../lib/free-web-retrieval.ts";

const QUESTION = "On the official page example.com/news/launch-day, what are the exact title and publication date? Cite the exact URL.";
const scope = sourceDomainScopeFromPrompt(QUESTION);
const PAGE = `<!doctype html><html><head><title>Launch Day | Example</title>
<meta property="og:title" content="Launch Day &amp; More">
<meta property="article:published_time" content="2024-03-04T08:00:00Z">
<meta name="description" content="We launched."></head><body>ignored body</body></html>`;
const RSS = (items) => `<?xml version="1.0"?><rss><channel>${items.map((url) => `<item><title>t</title><link>${url}</link><description>snippet</description></item>`).join("")}</channel></rss>`;

function html(body, { url = "https://example.com/news/launch-day", type = "text/html; charset=utf-8", status = 200 } = {}) {
  const response = new Response(body, { status, headers: { "content-type": type } });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

async function withEnv(fetchImpl, fn) {
  const originalFetch = globalThis.fetch;
  const rights = process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;
  const brave = process.env.BRAVE_SEARCH_API_KEY;
  process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED = "1";
  delete process.env.BRAVE_SEARCH_API_KEY;
  const calls = [];
  globalThis.fetch = async (input, init) => { calls.push(String(input)); return fetchImpl(String(input), init); };
  try { return await fn(calls); } finally {
    globalThis.fetch = originalFetch;
    if (rights === undefined) delete process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED; else process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED = rights;
    if (brave !== undefined) process.env.BRAVE_SEARCH_API_KEY = brave;
  }
}

test("extracts only publisher-stated title, ISO publication date and description", () => {
  assert.deepEqual(extractScopedPageFacts(PAGE), { title: "Launch Day & More", published: "2024-03-04T08:00:00Z", description: "We launched." });
  assert.equal(extractScopedPageFacts('<meta property="article:published_time" content="last Tuesday">').published, null, "non-ISO dates are never passed on");
  assert.equal(extractScopedPageFacts('<script type="application/ld+json">{"datePublished":"2023-12-06"}</script>').published, "2023-12-06");
});

test("reads only the exact named https page and rejects off-scope redirects and non-HTML", async () => {
  assert.deepEqual(scope, { domain: "example.com", pathPrefix: "/news/launch-day" });
  await withEnv(async () => html(PAGE), async (calls) => {
    assert.equal(await readScopedOfficialPage("https://example.com/news/other", scope), null);
    assert.equal(await readScopedOfficialPage("http://example.com/news/launch-day", scope), null);
    assert.equal(await readScopedOfficialPage("https://example.com:8443/news/launch-day", scope), null);
    assert.equal(calls.length, 0, "no request for anything but the exact https page");
    assert.equal((await readScopedOfficialPage("https://www.example.com/news/launch-day/", scope)).published, "2024-03-04T08:00:00Z");
  });
  await withEnv(async () => html(PAGE, { url: "https://evil.example/news/launch-day" }), async () => {
    assert.equal(await readScopedOfficialPage("https://example.com/news/launch-day", scope), null);
  });
  await withEnv(async () => html("%PDF", { type: "application/pdf" }), async () => {
    assert.equal(await readScopedOfficialPage("https://example.com/news/launch-day", scope), null);
  });
  await withEnv(async () => html("blocked", { status: 403 }), async () => {
    assert.equal(await readScopedOfficialPage("https://example.com/news/launch-day", scope), null);
  });
  await withEnv(async () => { throw new TypeError("network down"); }, async () => {
    assert.equal(await readScopedOfficialPage("https://example.com/news/launch-day", scope), null);
  });
});

test("named page stands as its own source when search missed it, with page metadata in evidence", async () => {
  await withEnv(async (url) => url.startsWith("https://www.bing.com/")
    ? new Response(RSS(["https://other.example/x"]), { headers: { "content-type": "application/rss+xml" } })
    : html(PAGE), async () => {
    const evidence = await retrieveFreeWebEvidence("site:example.com launch day", undefined, scope);
    assert.equal(evidence.scopedPageRead, true);
    assert.deepEqual(evidence.citations.map((c) => c.url), ["https://example.com/news/launch-day"]);
    assert.match(evidence.content, /Publisher page metadata \(read directly from this exact URL\)/);
    assert.match(evidence.content, /Page publication timestamp \(ISO 8601, as published\): 2024-03-04T08:00:00Z/);
    assert.doesNotMatch(evidence.content, /other\.example/);
  });
});

test("an unreadable named page attaches nothing and keeps the strict unavailable outcome", async () => {
  await withEnv(async (url) => url.startsWith("https://www.bing.com/")
    ? new Response(RSS(["https://other.example/x"]), { headers: { "content-type": "application/rss+xml" } })
    : html("blocked", { status: 403 }), async () => {
    await assert.rejects(retrieveFreeWebEvidence("site:example.com launch day", undefined, scope), /provenance/);
  });
  await withEnv(async (url) => url.startsWith("https://www.bing.com/")
    ? new Response(RSS(["https://example.com/news/launch-day"]), { headers: { "content-type": "application/rss+xml" } })
    : html("blocked", { status: 403 }), async () => {
    const evidence = await retrieveFreeWebEvidence("site:example.com launch day", undefined, scope);
    assert.equal(evidence.scopedPageRead, false);
    assert.doesNotMatch(evidence.content, /Publisher page metadata/);
  });
});

test("a one-segment section scope (newest-post questions) is never read as a page", async () => {
  const section = { domain: "example.com", pathPrefix: "/news" };
  await withEnv(async () => html(PAGE, { url: "https://example.com/news" }), async (calls) => {
    assert.equal(await readScopedOfficialPage("https://example.com/news", section), null);
    assert.equal(calls.length, 0);
  });
});
