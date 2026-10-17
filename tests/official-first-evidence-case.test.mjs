// Deterministic release-positive qualification, offline only; no provider calls.
import assert from "node:assert/strict";
import test from "node:test";
import {
  assessOfficialFirstEvidenceAnswer,
  officialFirstEvidenceQuestion,
  officialFirstEvidenceUrl,
} from "../lib/official-first-evidence-case.mjs";
import { sourceDomainScopeFromPrompt } from "../lib/official-source-relevance.mjs";

const exact = [{ url: officialFirstEvidenceUrl }];
const valid = "Title: Introducing the next generation of Claude\nPublication date: March 4, 2024\nSource: https://www.anthropic.com/news/claude-3-family";

test("fixed question requests directly evidenced date/title with one strict official-page scope", () => {
  assert.deepEqual(sourceDomainScopeFromPrompt(officialFirstEvidenceQuestion), { domain: "anthropic.com", pathPrefix: "/news/claude-3-family" });
  assert.match(officialFirstEvidenceQuestion, /not memory/);
  assert.match(officialFirstEvidenceQuestion, /If the source does not establish both details/);
  assert.doesNotMatch(officialFirstEvidenceQuestion, /most recently|newest/i);
});

test("positive: exact cited official article and explicit correct title/date qualify structurally", () => {
  assert.deepEqual(assessOfficialFirstEvidenceAnswer(valid, exact), { ok: true, reason: null });
  assert.deepEqual(assessOfficialFirstEvidenceAnswer("- **Title:** Introducing the next generation of Claude\n- **Publication date:** 2024-03-04", exact), { ok: true, reason: null });
});

test("negative: a refusal with a real official link is still unknown", () => {
  assert.equal(assessOfficialFirstEvidenceAnswer("I cannot verify the article date from the provided evidence.", exact).reason, "ABSTENTION_NOT_VERIFIED_EVIDENCE");
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Introducing the next generation of Claude\nPublication date: March 4, 2024\nI cannot verify this from the page.", exact).reason, "ABSTENTION_NOT_VERIFIED_EVIDENCE");
});

test("negative: arbitrary date or wrong title never becomes a valid official observation", () => {
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Another Post\nPublication date: March 4, 2024", exact).reason, "EXPECTED_ARTICLE_TITLE_UNVERIFIED");
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Introducing the next generation of Claude\nPublication date: 2024-06-01", exact).reason, "EXPECTED_ARTICLE_DATE_UNVERIFIED");
  assert.equal(assessOfficialFirstEvidenceAnswer("Other title\nThe article Introducing the next generation of Claude was published March 4, 2024.", exact).reason, "EXPECTED_ARTICLE_TITLE_UNVERIFIED");
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Introducing the next generation of Claude\nPublication date: March 4, 2024\nPublication date: 2024-01-01", exact).reason, "EXPECTED_ARTICLE_DATE_UNVERIFIED");
});

test("negative: no source, unrelated sections, spoofed host and mixed references fail closed", () => {
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, []).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, [{ url: "https://anthropic.com/news/" }]).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, [{ url: "https://anthropic.com.evil.example/news/claude-3-family" }]).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, [{ url: "https://anthropic.com/news/claude-3-family/other" }]).reason, "EXACT_OFFICIAL_ARTICLE_CITATION_MISSING");
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, [...exact, { url: "https://example.org/" }]).reason, "UNQUALIFIED_CITATIONS_PRESENT");
});

test("negative: an off-target model-written URL is not a returned citation", () => {
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, [{ url: "https://anthropic.com/news/other" }]).ok, false);
  assert.equal(assessOfficialFirstEvidenceAnswer(valid, null).ok, false);
});

test("the acceptance fixture cannot assert a native consumer ChatGPT product observation", () => {
  assert.doesNotMatch(officialFirstEvidenceQuestion, /consumer app|rankings?|perplexity|gemini|claude\.ai/i);
});

test("Chat 01: the previous openai.com fixture text is kept only as a migratable legacy slot", async () => {
  const { previousOfficialFirstEvidenceQuestion } = await import("../lib/official-first-evidence-case.mjs");
  assert.notEqual(previousOfficialFirstEvidenceQuestion, officialFirstEvidenceQuestion);
  assert.deepEqual(sourceDomainScopeFromPrompt(previousOfficialFirstEvidenceQuestion), { domain: "openai.com", pathPrefix: "/index/chatgpt" });
});

test("Chat 01: JSON-mode answers with space-separated lines and an ISO UTC date qualify; no looser reading", () => {
  const observed = "Title: Introducing the next generation of Claude      Publication date: 2024-03-04T08:00:00.000Z    Source: https://www.anthropic.com/news/claude-3-family\n";
  assert.deepEqual(assessOfficialFirstEvidenceAnswer(observed, exact), { ok: true, reason: null });
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Introducing the next generation of Claude Publication date: 2024-03-04", exact).reason, "EXPECTED_ARTICLE_TITLE_UNVERIFIED");
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Introducing the next generation of Claude    Publication date: 2024-03-04T23:30:00-05:00", exact).reason, "EXPECTED_ARTICLE_DATE_UNVERIFIED");
  assert.equal(assessOfficialFirstEvidenceAnswer("Title: Another Post    Publication date: 2024-03-04", exact).reason, "EXPECTED_ARTICLE_TITLE_UNVERIFIED");
});
