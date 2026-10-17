import assert from "node:assert/strict";
import test from "node:test";
import { findSourceXrayTarget } from "../lib/source-xray-link.ts";

const sources = [{ id: "s1", url: "https://anthropic.com/news/claude-3-family" }];

test("Chat 01: a www citation maps to its www-less canonical source record", () => {
  assert.equal(findSourceXrayTarget("https://www.anthropic.com/news/claude-3-family", sources)?.id, "s1");
  assert.equal(findSourceXrayTarget("https://www.anthropic.com/news/claude-3-family/", sources)?.id, "s1");
});

test("Chat 01: other hosts and paths still never borrow a source record", () => {
  assert.equal(findSourceXrayTarget("https://news.anthropic.com/news/claude-3-family", sources), null);
  assert.equal(findSourceXrayTarget("https://wwwanthropic.com/news/claude-3-family", sources), null);
  assert.equal(findSourceXrayTarget("https://www.anthropic.com/news/claude-3", sources), null);
});
