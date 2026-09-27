import assert from "node:assert/strict";
import test from "node:test";
import { parseBingSearchRss, retrieveFreeWebEvidence } from "../lib/free-web-retrieval.ts";

test("Bing RSS citations are parsed only from structured retrieval items and deduplicated", () => {
  const raw = `<?xml version="1.0"?>
  <rss><channel>
    <item>
      <title>OpenAI News &amp; Updates</title>
      <link>https://openai.com/news/example</link>
      <description><![CDATA[Current result snippet with <b>evidence</b>.]]></description>
    </item>
    <item>
      <title>Duplicate</title>
      <link>https://openai.com/news/example</link>
      <description>Duplicate result.</description>
    </item>
    <item>
      <title>Another source</title>
      <link>https://example.com/reference#section</link>
      <description>Second result &amp; context.</description>
    </item>
  </channel></rss>`;

  assert.deepEqual(parseBingSearchRss(raw), [
    {
      url: "https://openai.com/news/example",
      title: "OpenAI News & Updates",
      snippet: "Current result snippet with evidence.",
    },
    {
      url: "https://example.com/reference",
      title: "Another source",
      snippet: "Second result & context.",
    },
  ]);
});

test("Bing search and click-tracking URLs are never persisted as customer evidence citations", () => {
  const raw = `<rss><channel>
    <item><title>Search</title><link>https://www.bing.com/search?q=test</link><description>no</description></item>
    <item><title>Tracking</title><link>https://www.bing.com/ck/a?u=abc</link><description>no</description></item>
  </channel></rss>`;
  assert.deepEqual(parseBingSearchRss(raw), []);
});

// Synthetic RSS only. Never make an external search query in unit tests.
const syntheticRss = `<?xml version="1.0"?><rss><channel>
  <item><title>Irrelevant glossary</title><link>https://dictionary.example/use</link><description>Off-topic</description></item>
  <item><title>Synthetic official record</title><link>https://openai.com/news/synthetic-example</link><description>Fixture-only announcement</description></item>
  <item><title>Fake lookalike domain</title><link>https://openai.com.attacker.example/news</link><description>Not an official domain</description></item>
</channel></rss>`;

async function withSyntheticBing(responseXml, action) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(responseXml, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try { return await action(calls); }
  finally { globalThis.fetch = original; }
}

test("explicit official-source question uses bounded scoped search and excludes unrelated cited domains", async () => {
  const question = "Use web search now. According to the official OpenAI website, what is the title and publication date of the most recently published post on openai.com/news at the time you answer? Cite the exact openai.com source URL you used. If you cannot verify it with current web evidence, say so rather than answering from memory.";
  await withSyntheticBing(syntheticRss, async calls => {
    const evidence = await retrieveFreeWebEvidence(question);
    assert.equal(calls.length, 1);
    const query = new URL(calls[0]).searchParams.get("q");
    assert.match(query, /^site:openai\\.com news /);
    assert.doesNotMatch(query, /Use web search now/);
    assert.equal(evidence.citations.length, 1);
    assert.equal(evidence.citations[0].url, "https://openai.com/news/synthetic-example");
    assert.doesNotMatch(evidence.content, /dictionary\\.example|attacker\\.example/);
  });
});

test("explicit official domain with no qualifying sources fails closed before a provider could use unrelated evidence", async () => {
  await withSyntheticBing(`<rss><channel><item><title>Unrelated</title><link>https://dictionary.example/use</link><description>No proof</description></item></channel></rss>`, async calls => {
    await assert.rejects(retrieveFreeWebEvidence("According to the official OpenAI website, what changed on openai.com/news? Cite the exact openai.com source."), /Official-domain evidence was unavailable/);
    assert.equal(calls.length, 1);
  });
});

test("ordinary multi-vendor buyer questions are not restricted to one official domain", async () => {
  await withSyntheticBing(syntheticRss, async calls => {
    const evidence = await retrieveFreeWebEvidence("Which vendor sources should a B2B buyer review?");
    assert.equal(evidence.citations.length, 3);
    assert.doesNotMatch(new URL(calls[0]).searchParams.get("q"), /^site:/);
  });
});
