import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assessRetrievedTopicRelevance, RetrievedTopicUnavailableError } from "../lib/retrieval-topic-relevance.mjs";
const fixture = JSON.parse(readFileSync(new URL("./fixtures/fm01-irrelevant-retrieval.json", import.meta.url), "utf8"));
const question = fixture.question;
test("A08/CV-01: eight synthetic dictionary/polysemy hits are not B2B evidence", () => {
  const result = assessRetrievedTopicRelevance(question, fixture.results);
  assert.deepEqual(result.accepted, []);
  assert.equal(result.rejected.length, 8);
  assert.equal(result.reason, "NO_TOPICALLY_RELEVANT_RESULTS");
});
test("A08: relevant AI-visibility B2B control passes", () => {
  const good = {url:"https://vendor.example/research/ai-visibility-monitoring",title:"AI visibility tracking for B2B SaaS",snippet:"Evaluate monitoring and brand visibility platforms"};
  const result = assessRetrievedTopicRelevance(question, [fixture.results[0], good]);
  assert.deepEqual(result.accepted, [good]);
  assert.equal(result.rejected.length, 1);
});
test("A08: empty, malformed and partially irrelevant results cannot imply complete coverage", () => {
  for (const items of [[], [{url:"https://example.org/unknown"}], fixture.results.slice(0,4)]) {
    assert.equal(assessRetrievedTopicRelevance(question,items).accepted.length, 0);
  }
  const good = {url:"https://vendor.example/ai-visibility",title:"AI visibility monitoring software",snippet:"B2B SaaS platforms"};
  const mixed = assessRetrievedTopicRelevance(question,[...fixture.results,good]);
  assert.deepEqual(mixed.accepted,[good]);
  assert.equal(mixed.rejected.length,8);
});
test("A08: ambiguous question fails closed", () => {
  const result = assessRetrievedTopicRelevance("What should I choose?",[{url:"https://example.com/choose",title:"Choosing software"}]);
  assert.deepEqual(result.accepted, []);
  assert.equal(result.reason, "QUESTION_TOO_AMBIGUOUS");
});
test("A08: CRM entity and software synonyms are admitted, generic business pages are not", () => {
  const q = "Which CRM platforms work for B2B sales teams?";
  const good = {url:"https://example.com/crm",title:"CRM software for business sales",snippet:"For B2B teams"};
  const bad = {url:"https://example.org/sales",title:"Sales tax definition",snippet:"Business advice"};
  assert.deepEqual(assessRetrievedTopicRelevance(q,[bad,good]).accepted,[good]);
});
test("A08: domain/path alone are not topic proof", () => {
  const result = assessRetrievedTopicRelevance(question,[{url:"https://vendor.example/blog/should",title:"Dictionary: should",snippet:"Grammar"}]);
  assert.deepEqual(result.accepted,[]);
});
test("A08: unavailable is not zero visibility", () => {
  const err = new RetrievedTopicUnavailableError("NO_TOPICALLY_RELEVANT_RESULTS",8);
  assert.equal(err.retrievedCount,8);
  assert.match(err.message,/withheld, not counted as answer evidence/);
});
test("A29/CV-07: no direct onboarding provider request may bypass central budget admission", async () => {
  const source = readFileSync(new URL("../lib/onboarding-enrichment.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /groqAdapter\.run\s*\(/);
  assert.match(source, /budget admission/i);
});
