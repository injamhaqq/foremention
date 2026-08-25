import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("auth routes enter the Evidence Standard workspace without changing auth mechanics", () => {
  const layout = read("app/layout.tsx");
  const login = read("app/login/page.tsx");
  const signup = read("app/signup/page.tsx");
  const form = read("components/auth-form.tsx");

  assert.match(layout, /evidence-standard-auth\.css/);
  assert.match(layout, /evidence-standard-auth-a11y\.css/);
  assert.match(login, /auth-page auth-page--evidence/);
  assert.match(signup, /auth-page auth-page--evidence/);
  assert.match(login, /Recommendation intelligence for B2B SaaS/);
  assert.match(signup, /Recommendation intelligence for B2B SaaS/);
  assert.match(login, /Evidence before theatre/);
  assert.match(signup, /Evidence before theatre/);
  assert.doesNotMatch(login, />EVIDENCE BEFORE THEATRE</);
  assert.doesNotMatch(signup, />EVIDENCE BEFORE THEATRE</);
  assert.match(signup, /Private beta/);
  assert.match(signup, /Creating a workspace does not charge a card/);
  assert.match(form, /data-evidence-record="auth"/);

  // Security, autofill, and continuation contracts remain intact.
  assert.match(form, /safeAuthNext\(next\)/);
  assert.match(form, /\{12,\}/);
  assert.match(form, /password !== confirmation/);
  assert.match(form, /autoComplete="email"/);
  assert.match(form, /autoComplete=\{isLogin \? "current-password" : "new-password"\}/);
  assert.match(form, /role="alert"/);
  assert.match(form, /aria-live="polite"/);
});

test("recovery and callback screens avoid decorative evidence-step theatre", () => {
  const forgot = read("app/forgot-password/page.tsx");
  const reset = read("app/reset-password/page.tsx");
  const callback = read("components/auth-callback.tsx");

  assert.doesNotMatch(forgot, /auth-brand__trace/);
  assert.doesNotMatch(reset, /auth-brand__trace/);
  assert.doesNotMatch(callback, /auth-brand__trace/);
  assert.match(forgot, /Evidence before theatre/);
  assert.match(reset, /Evidence before theatre/);
});

test("onboarding is presented as a measurement record while retaining the proven workflow", () => {
  const wizard = read("components/onboarding-wizard.tsx");

  assert.match(wizard, /onboarding-wizard onboarding-wizard--evidence/);
  assert.match(wizard, /Measurement record setup/);
  assert.match(wizard, /01 \/ ORGANIZATION/);
  assert.match(wizard, /06 \/ REVIEW/);
  assert.match(wizard, /Review your evidence boundary/);
  assert.match(wizard, /Your workspace is private/);

  // Do not replace real onboarding behavior with a mock flow.
  assert.match(wizard, /\/api\/onboarding\/analyze/);
  assert.match(wizard, /\/api\/onboarding/);
  assert.match(wizard, /startFirstAudit/);
  assert.match(wizard, /idempotency-key/);
  assert.match(wizard, /localStorage/);
});

test("Evidence Standard auth and onboarding CSS is restrained, responsive, and semantic", () => {
  const css = `${read("app/evidence-standard-auth.css")}\n${read("app/evidence-standard-auth-a11y.css")}`;

  for (const token of ["--fm-paper", "--fm-surface", "--fm-ink", "--fm-rule", "--fm-evidence", "--fm-evidence-wash"]) {
    assert.match(css, new RegExp(token));
  }
  assert.match(css, /\.auth-page--evidence/);
  assert.match(css, /\.onboarding-wizard--evidence/);
  assert.match(css, /\.auth-brand__principle[\s\S]*text-transform:\s*uppercase/);
  assert.match(css, /\.auth-brand__trace span,[\s\S]*\.auth-brand__trace small[\s\S]*font-size:\s*11px/);
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /radial-gradient|linear-gradient|filter:\s*blur|box-shadow:\s*0 0 [^;]*rgba/i);
});
