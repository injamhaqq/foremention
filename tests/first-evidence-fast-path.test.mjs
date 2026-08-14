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

test("run detail keeps provider citations intact and links only mapped pages into Source X-Ray", () => {
  const page = read("app/app/runs/[id]/page.tsx");
  const matcher = read("lib/source-xray-link.ts");

  assert.match(page, /loadSourceMap/);
  assert.match(page, /findSourceXrayTarget\(citation\.url, sourceMap\)/);
  assert.match(page, /href=\{citation\.url\} target="_blank" rel="noreferrer"/);
  assert.match(page, /href=\{`\/app\/sources\/\$\{sourceTarget\.id\}`\}/);
  assert.match(page, /Inspect this citation in Source X-Ray/);
  assert.match(page, /Approve the run only when they match what the AI system actually returned/);

  assert.match(matcher, /new URL\(value\)/);
  assert.match(matcher, /url\.hash = ""/);
  assert.ok(matcher.includes('url.pathname = url.pathname.replace(/\\/+$/, "");'));
  assert.match(matcher, /comparablePageUrl\(source\.url\) === citationKey/);
  assert.doesNotMatch(matcher, /hostname/);
});

test("activation completion is tied to a newly created reviewed opportunity", () => {
  const review = read("components/source-review-form.tsx");
  const contract = read("docs/ACTIVATION-FUNNEL-EVENTS-2026-08-14.md");

  assert.match(review, /result\.opportunity\?\.action === "created"/);
  assert.match(review, /captureProductEvent\("reviewed_opportunity_created"\)/);
  assert.match(review, /captureProductEvent\("activation_completed"\)/);
  assert.match(contract, /`activation_completed` — emitted at the same evidence-backed boundary/);
  assert.match(contract, /not a claim that the opportunity caused a later business outcome/);
});

test("first-evidence changes do not introduce a second data or orchestration system", () => {
  const sources = [
    read("components/onboarding-wizard.tsx"),
    read("app/app/runs/[id]/page.tsx"),
    read("lib/source-xray-link.ts"),
    read("components/source-review-form.tsx"),
  ].join("\n");

  assert.doesNotMatch(sources, /qdrant|pinecone|weaviate|meilisearch|falkordb|temporal|firecrawl|crawl4ai/i);
});
