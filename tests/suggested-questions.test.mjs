import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildSourceMapQuestionSuggestions } from "../lib/question-suggestions.ts";

test("follow-up questions are derived from recorded Source Map framing", () => {
  const suggestions = buildSourceMapQuestionSuggestions("AI visibility software", [{ id: "1", rank: 1, domain: "example.com", title: "Guide", url: "https://example.com", type: "industry guide", influence: "unknown", engines: ["Perplexity"], clientPresent: false, competitors: ["Acme"], crawlerAccess: "open", route: "unknown", feasibility: "unknown", evidenceCount: 3 }]);
  assert.equal(suggestions.length, 5); assert.match(suggestions[0].text, /example\.com/); assert.match(suggestions[1].text, /Acme/); assert.match(suggestions[3].text, /Perplexity/);
  assert.deepEqual(buildSourceMapQuestionSuggestions("Anything", []), []);
});

test("Buyer Questions labels observed suggestions without search-volume claims", async () => {
  const [page, component] = await Promise.all([readFile(new URL("../app/app/prompts/page.tsx", import.meta.url), "utf8"), readFile(new URL("../components/prompt-library.tsx", import.meta.url), "utf8")]);
  assert.match(page, /buildSourceMapQuestionSuggestions/); assert.match(component, /Suggested after your first run/); assert.match(component, /not search-volume estimates/);
});
