import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public score CTA preserves only a score identifier into signup", () => {
  const ui = read("components/visibility-score-form.tsx");
  assert.match(ui, /href=\{`\/signup\?score_id=\$\{encodeURIComponent\(result\.id\)\}`\}/);
  assert.match(ui, /score_monitor_clicked/);
  assert.match(ui, /public result does not become verified workspace evidence/i);
  assert.doesNotMatch(ui, /signup\?brand=/);
  assert.doesNotMatch(ui, /signup\?category=/);
});

test("score handoff accepts only the existing public score id shape", () => {
  const handoff = read("lib/score-handoff.ts");
  assert.match(handoff, /\^\[0-9a-f-\]\{36\}\$\/i/);
  assert.match(handoff, /safePublicScoreId/);
  assert.match(handoff, /\/app\/onboarding\?score_id=/);
  assert.match(handoff, /return scoreId \?/);
});

test("signup and confirmation preserve a safe continuation path", () => {
  const signupPage = read("app/signup/page.tsx");
  const authForm = read("components/auth-form.tsx");
  const signupRoute = read("app/api/auth/signup/route.ts");
  const callback = read("components/auth-callback.tsx");
  const authNavigation = read("lib/google-auth.ts");

  assert.match(signupPage, /scoreOnboardingNext/);
  assert.match(signupPage, /safeAuthNext/);
  assert.match(signupPage, /<AuthForm mode="signup" next=\{next\}/);
  assert.match(authForm, /const safeNext = safeAuthNext\(next\)/);
  assert.match(authForm, /next: safeNext/);
  assert.match(signupRoute, /const next = safeAuthNext/);
  assert.match(signupRoute, /emailRedirect\.searchParams\.set\("next", next\)/);
  assert.match(callback, /safeAuthNext\(requestedNext\)/);
  assert.match(authNavigation, /new URL\(value, AUTH_NEXT_BASE\)/);
  assert.match(authNavigation, /parsed\.origin !== AUTH_NEXT_BASE\.origin/);
});

test("score-aware onboarding carries setup context without importing public evidence", () => {
  const wrapper = read("components/score-aware-onboarding.tsx");
  const onboarding = read("app/app/onboarding/page.tsx");

  assert.match(wrapper, /brand/);
  assert.match(wrapper, /category/);
  assert.match(wrapper, /questions/);
  assert.match(wrapper, /companyName: brand/);
  assert.match(wrapper, /prompts: prompts\.join/);
  assert.match(wrapper, /hasUsableSavedDraft/);
  assert.match(wrapper, /public result itself does not become verified workspace evidence/i);
  assert.doesNotMatch(wrapper, /citations:/);
  assert.doesNotMatch(wrapper, /score:/);
  assert.doesNotMatch(wrapper, /appearedIn:/);
  assert.doesNotMatch(wrapper, /provider:/);
  assert.doesNotMatch(wrapper, /model:/);
  assert.match(onboarding, /safePublicScoreId/);
  assert.match(onboarding, /ScoreAwareOnboarding/);
});

test("malformed or unavailable score context fails safely to normal onboarding", () => {
  const wrapper = read("components/score-aware-onboarding.tsx");
  assert.match(wrapper, /score_context_prefill_failed/);
  assert.match(wrapper, /if \(!response\.ok \|\| brand\.length < 2 \|\| category\.length < 3 \|\| prompts\.length === 0\)/);
  assert.match(wrapper, /finally \{/);
  assert.match(wrapper, /setReady\(true\)/);
});
