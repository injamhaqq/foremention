import assert from "node:assert/strict";
import test from "node:test";
import { parseJinaSearchCitations } from "../lib/free-web-retrieval.ts";

test("Jina search citations are parsed only from retrieval output and deduplicated", () => {
  const raw = [
    "Title: OpenAI News",
    "URL Source: https://openai.com/news/example",
    "Markdown Content:",
    "[OpenAI News](https://openai.com/news/example)",
    "Title: Independent source",
    "URL Source: https://example.org/report#section",
  ].join("\n");
  assert.deepEqual(parseJinaSearchCitations(raw), [
    { url: "https://openai.com/news/example", title: "OpenAI News" },
    { url: "https://example.org/report", title: "Independent source" },
  ]);
});

test("Jina proxy URLs are never persisted as customer evidence citations", () => {
  const raw = [
    "Title: Search proxy",
    "URL Source: https://s.jina.ai/example",
    "Title: Reader proxy",
    "URL Source: https://r.jina.ai/https://example.com",
  ].join("\n");
  assert.deepEqual(parseJinaSearchCitations(raw), []);
});
