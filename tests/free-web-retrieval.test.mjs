import assert from "node:assert/strict";
import test from "node:test";
import { parseBrowserSearchLinks } from "../lib/free-web-retrieval.ts";

test("Browser Run search links preserve only unique public evidence URLs", () => {
  const payload = {
    result: [
      "https://openai.com/news/example#section",
      "https://openai.com/news/example",
      "https://example.org/report",
      "https://search.brave.com/search?q=example",
      "http://localhost/private",
      "http://127.0.0.1/private",
      "https://192.168.1.4/private",
    ],
  };
  assert.deepEqual(parseBrowserSearchLinks(payload), [
    { url: "https://openai.com/news/example", title: "openai.com" },
    { url: "https://example.org/report", title: "example.org" },
  ]);
});

test("Browser Run search rejects internal search and private network targets", () => {
  assert.deepEqual(parseBrowserSearchLinks([
    "https://search.brave.com/",
    "https://search.brave.com/search?q=foremention",
    "http://10.0.0.2/",
    "http://172.20.1.4/",
    "http://192.168.0.2/",
    "http://169.254.1.1/",
    "http://localhost/",
  ]), []);
});
