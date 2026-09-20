import assert from "node:assert/strict";
import test from "node:test";
import { parseBingSearchRss } from "../lib/free-web-retrieval.ts";

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
      snippet: "Current result snippet with evidence .",
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
