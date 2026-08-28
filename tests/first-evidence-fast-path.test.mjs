import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("onboarding preserves the five-question baseline but queues one question for first evidence", () => {
  const onboarding = read("components/onboarding-wizard.tsx");

  assert.match(onboarding, /filter\(\(prompt\) => prompt\.approved\)\.slice\(0, 1\)/);
  assert.match(onboarding, /promptIds\.length !== 1/);
  assert.match(onboarding, /collection_started", \{ question_count: 1, provider_count: 1/);
  assert.match(onboarding, /saved five become the stable baseline for comparable runs/);
  assert.match(onboarding, /full five-question baseline remains saved for later collections/);
  assert.doesNotMatch(onboarding, /collecting five real answers/i);
  assert.doesNotMatch(onboarding, /takes about 2 minutes/i);
});

test("completed onboarding collection opens the exact first-evidence run instead of the dashboard", () => {
  const onboarding = read("components/onboarding-wizard.tsx");

  assert.match(onboarding, /window\.location\.assign\(`\/app\/runs\/\$\{firstRunId\}\?first_evidence=1`\)/);
  assert.match(onboarding, /View live evidence status/);
  assert.doesNotMatch(onboarding, /window\.location\.assign\("\/app"\)/);
});

test("run detail keeps provider citations intact and contains only its own finalized mapped evidence inside Recommendation Record", () => {
  const page = read("app/app/runs/[id]/page.tsx");
  const record = read("components/recommendation-answer-record.tsx");
  const evidence = read("components/recommendation-source-evidence.tsx");
  const matcher = read("lib/source-xray-link.ts");

  assert.match(page, /loadTruthfulSourceMap\(viewer, \{ runId: run\.id \}\)/);
  assert.match(page, /\["complete", "partial"\]\.includes\(run\.status\)/);
  assert.match(page, /sourceMap=\{sourceMap\}/);
  assert.match(record, /reviewMode \? null : findSourceXrayTarget\(citation\.url, sourceMap\)/);
  assert.match(record, /href=\{citation\.url\} target="_blank" rel="noreferrer"/);
  assert.match(record, /canonical-contained-evidence/);
  assert.match(record, /Evidence inspection/);
  assert.match(record, /RecommendationSourceEvidence/);
  assert.match(evidence, /SourceLiveInspector/);
  assert.match(evidence, /SourceReviewForm/);
  assert.doesNotMatch(`${page}\n${record}\n${evidence}`, /href=\{`\/app\/sources|Source X-Ray/i);
  assert.match(page, /Approve the run only when they match what the AI system actually returned/);

  assert.match(matcher, /new URL\(value\)/);
  assert.match(matcher, /url\.hash = ""/);
  assert.ok(matcher.includes('url.pathname = url.pathname.replace(/\\/+$/, "");'));
  assert.match(matcher, /comparablePageUrl\(source\.url\) === citationKey/);
  assert.doesNotMatch(matcher, /hostname/);
});

test("decision insight is tied to a newly created reviewed opportunity", () => {
  const review = read("components/source-review-form.tsx");
  const analyticsContract = read("lib/product-analytics-contract.ts");

  assert.match(review, /result\.opportunity\?\.action === "created"/);
  assert.match(review, /captureProductEvent\("decision_insight_reached", \{ insight_type: "actionable_source_gap" \}\)/);
  assert.equal((review.match(/captureProductEvent\("decision_insight_reached"/g) || []).length, 1);
  assert.match(analyticsContract, /const insightTypes = new Set\(\["actionable_source_gap"\]\)/);
  assert.doesNotMatch(review, /captureProductEvent\("activation_completed"/);
  assert.doesNotMatch(review, /captureProductEvent\("reviewed_opportunity_created"/);
});

test("first-evidence changes do not introduce a second data or orchestration system", () => {
  const sources = [
    read("components/onboarding-wizard.tsx"),
    read("app/app/runs/[id]/page.tsx"),
    read("components/recommendation-answer-record.tsx"),
    read("components/recommendation-source-evidence.tsx"),
    read("components/source-review-form.tsx"),
  ].join("\n");

  assert.doesNotMatch(sources, /qdrant|pinecone|weaviate|meilisearch|falkordb|temporal|firecrawl|crawl4ai/i);
});
