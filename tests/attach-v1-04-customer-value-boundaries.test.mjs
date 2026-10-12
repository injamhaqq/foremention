import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateApprovedBuyerQuestions } from "../lib/approved-buyer-questions.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("A28: only the exact approved question wording may be persisted", () => {
  assert.deepEqual(validateApprovedBuyerQuestions([" What is the best CRM? "]), {
    questions: ["What is the best CRM?"], error: null,
  });
  const five = ["One?", "Two?", "Three?", "Four?", "Five?"];
  assert.deepEqual(validateApprovedBuyerQuestions(five), { questions: five, error: null });
  assert.deepEqual(validateApprovedBuyerQuestions(["A\u00a0question?"]).questions, ["A question?"]);
  for (const input of [undefined, null, "One?", [], ["  "], ["Same?", "same?"], [...five, "Six?"], [123], ["x".repeat(1001)]]) {
    const result = validateApprovedBuyerQuestions(input);
    assert.equal(result.questions, null, `Expected review rejection for ${JSON.stringify(input)}`);
    assert.ok(result.error);
  }
  const route = read("app/api/onboarding/route.ts");
  assert.match(route, /validateApprovedBuyerQuestions\(raw\.prompts\)/);
  assert.match(route, /const prompts = approval\.questions/);
  assert.doesNotMatch(route, /\.\.\.submittedPrompts, \.\.\.generatedPrompts/);
  assert.match(route, /suggestedQuestions: generatedPrompts/);
});

test("A28: suggestions are user-triggered after removal and collection is opt-in", () => {
  const wizard = read("components/onboarding-wizard.tsx");
  assert.doesNotMatch(wizard, /if \(step === 3 && !prompts\.length\)/);
  assert.match(wizard, /Generate five suggestions for review/);
  assert.match(wizard, /firstAuditProvider && startCollectionNow/);
  assert.match(wizard, /!startCollectionNow \|\| !firstAuditProvider/);
  assert.match(wizard, /type="checkbox" checked=\{startCollectionNow\}/);
  assert.match(wizard, /capacity and spending limits are checked by the server/);
  assert.match(wizard, /setStep\(4\); return;/);
});

test("A27: reserved comparison route cannot acquire Record actions", () => {
  const bridge = read("components/retention-surface-bridge.tsx");
  assert.match(bridge, /isUuid\(recordMatch\[1\]\)/);
  assert.match(bridge, /\{recordId && <RecordControls runId=\{recordId\}/);
  assert.doesNotMatch(bridge, /\{recordMatch && <RecordControls/);
});

test("A27: no mutation or export is rendered before scoped persisted eligibility", () => {
  const bridge = read("components/retention-surface-bridge.tsx");
  assert.match(bridge, /fetch\("\/api\/runs", \{ cache: "no-store", signal: controller\.signal \}\)/);
  assert.match(bridge, /Array\.isArray\(payload\.data\)/);
  assert.match(bridge, /run\.id === runId/);
  assert.match(bridge, /\["review", "complete", "partial"\]\.includes\(run\.status\)/);
  assert.match(bridge, /if \(eligibility !== "eligible"\) return null;/);
  assert.match(bridge, /\.catch\(\(\) => \{ if \(active\) setEligibility\("error"\); \}\)/);
  assert.match(bridge, /Retry Record action check/);
  assert.match(bridge, /Your saved Record was not changed/);
});

test("A15: first evidence polling is bounded and an interruption is not mistaken for a failed provider call", () => {
  const wizard = read("components/onboarding-wizard.tsx");
  assert.match(wizard, /pollCount >= 40/);
  assert.match(wizard, /if \(!response\.ok\) throw new Error\("Run status could not be checked\."\)/);
  assert.match(wizard, /if \(!Array\.isArray\(result\.data\)\)/);
  assert.match(wizard, /if \(pendingTimer !== null\) window\.clearTimeout\(pendingTimer\)/);
  assert.match(wizard, /could not confirm the final collection state/);
  assert.match(wizard, /Inspect saved run before retrying/);
  assert.match(wizard, /Inspect its exact Record before deciding whether to start another provider call/);
  assert.doesNotMatch(wizard, /automatically retry the provider/i);
});
