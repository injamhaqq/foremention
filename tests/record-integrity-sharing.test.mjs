import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recommendation Record integrity uses bounded reads plus persisted denominators", async () => {
  const integrity = await text("lib/record-integrity.ts");

  assert.match(integrity, /MAX_RECORD_ANSWERS \+ 1/);
  assert.match(integrity, /MAX_RECORD_QUESTIONS \+ 1/);
  assert.match(integrity, /MAX_RECORD_ATTEMPTS \+ 1/);
  assert.match(integrity, /selections\.length === Number\(run\.prompt_count\)/);
  assert.match(integrity, /answers\.length === Number\(run\.answer_count\)/);
  assert.match(integrity, /unique\(answerSlots\)/);
  assert.match(integrity, /answersBelongToManifest/);
  assert.match(integrity, /failedSlotsBelongToManifest/);
  assert.match(integrity, /missingSlots === 0/);
  assert.match(integrity, /answers: overflow \? \[\] : answers/);
});

test("safe conclusion requires a complete fully reviewed successful Record", async () => {
  const integrity = await text("lib/record-integrity.ts");

  assert.match(integrity, /const safeConclusion = completeObservationCoverage/);
  assert.match(integrity, /run\.status === "complete"/);
  assert.match(integrity, /failed\.size === 0/);
  assert.match(integrity, /excludedAnswers === 0/);
  assert.match(integrity, /verifiedAnswers === answers\.length/);
  assert.doesNotMatch(integrity, /reviewed > 0/);
});

test("print and private share views reuse the complete Record integrity contract", async () => {
  const [printPage, sharePage] = await Promise.all([
    text("app/app/runs/[id]/print/page.tsx"),
    text("app/share/record/[token]/page.tsx"),
  ]);

  assert.match(printPage, /loadRecordIntegrity\(\{/);
  assert.match(printPage, /projectId: context\.projectId/);
  assert.match(printPage, /record\.completeObservationCoverage \? record\.answers : \[\]/);
  assert.match(printPage, /record\.safeConclusion \? "Available" : "Withheld"/);
  assert.match(printPage, /Answer details withheld/);
  assert.doesNotMatch(printPage, /\["complete", "partial"\]\.includes\(run\.status\) && reviewed > 0/);

  assert.match(sharePage, /loadRecordIntegrity\(\{/);
  assert.match(sharePage, /serviceRole: true/);
  assert.match(sharePage, /record\.completeObservationCoverage \? record\.answers : \[\]/);
  assert.match(sharePage, /record\.safeConclusion \? "Available" : "Withheld"/);
  assert.match(sharePage, /Details withheld/);
  assert.doesNotMatch(sharePage, /run_answers\?select=/);
  assert.doesNotMatch(sharePage, /limit=200/);
  assert.doesNotMatch(sharePage, /\["complete", "partial"\]\.includes\(run\.status\) && reviewed > 0/);
});

test("Record share create and revoke direct IDs prove active-project run ownership", async () => {
  const route = await text("app/api/records/[id]/share/route.ts");

  const scopedRun = /runs\?select=id(?:,status)?&id=eq\.\$\{encodeURIComponent\(id\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&limit=1/g;
  assert.ok((route.match(scopedRun) || []).length >= 2);
  assert.match(route, /Recommendation Record not found in the active project/);
  assert.match(route, /record_shares\?id=eq\.\$\{encodeURIComponent\(body\.shareId\)\}&run_id=eq\.\$\{encodeURIComponent\(id\)\}&organization_id=eq\.\$\{context\.organizationId\}/);
});
