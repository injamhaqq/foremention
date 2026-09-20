import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchHtmlLinks, seedUrlsFromQuery } from "../lib/free-web-retrieval.ts";

test("explicit public URLs and domains in a buyer question become bounded fetch seeds", () => {
  assert.deepEqual(
    seedUrlsFromQuery("According to openai.com/news and https://example.org/report#part, what changed?"),
    [
      { url: "https://openai.com/news", title: "openai.com" },
      { url: "https://example.org/report", title: "example.org" },
    ],
  );
});

test("keyless search HTML keeps only external public URLs and unwraps DuckDuckGo targets", () => {
  const html = [
    '<a href="https://openai.com/news/example#section">OpenAI</a>',
    '<a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Freport">Example</a>',
    '<a href="https://search.brave.com/search?q=internal">Search</a>',
    '<a href="http://localhost/private">Local</a>',
    '<a href="http://127.0.0.1/private">Loopback</a>',
  ].join("");
  assert.deepEqual(parseSearchHtmlLinks(html, "https://html.duckduckgo.com/html/?q=test"), [
    { url: "https://openai.com/news/example", title: "openai.com" },
    { url: "https://example.org/report", title: "example.org" },
  ]);
});

test("private and search-engine-internal targets never become evidence citations", () => {
  const html = [
    '<a href="http://10.0.0.2/">Private</a>',
    '<a href="http://172.20.1.4/">Private</a>',
    '<a href="http://192.168.0.2/">Private</a>',
    '<a href="http://169.254.1.1/">Private</a>',
    '<a href="https://www.bing.com/ck/a?x=1">Tracker</a>',
  ].join("");
  assert.deepEqual(parseSearchHtmlLinks(html, "https://www.bing.com/search?q=test"), []);
});
