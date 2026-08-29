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

test("auth status and onboarding continuation copy stays actionable and security-accurate", () => {
  const login = read("app/login/page.tsx");
  const signup = read("app/signup/page.tsx");
  const onboarding = read("app/app/onboarding/page.tsx");

  assert.match(login, /You have been signed out of all devices/);
  assert.match(login, /Already-issued access tokens on another device can remain valid until their encoded expiry/);
  assert.match(login, /Sign in here to continue/);
  assert.match(signup, /Your public check results will carry into your workspace after you verify your account\./);
  assert.doesNotMatch(signup, /public result itself will not become verified workspace evidence/);
  assert.match(onboarding, />Start collection<\/Link>/);
  assert.doesNotMatch(onboarding, />Open collection<\/Link>/);
});

test("auth navigation keeps decorative arrows out of accessible names", () => {
  for (const file of ["app/login/page.tsx", "app/signup/page.tsx", "app/forgot-password/page.tsx", "app/reset-password/page.tsx", "components/auth-callback.tsx"]) {
    const source = read(file);
    assert.match(source, /<span aria-hidden="true">←<\/span> Back to site/);
    assert.doesNotMatch(source, />← Back to site</);
  }
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
  const page = read("app/app/onboarding/page.tsx");

  assert.match(wizard, /onboarding-wizard onboarding-wizard--evidence/);
  assert.match(wizard, /Measurement record setup/);
  assert.match(wizard, /01 \/ ORGANIZATION/);
  assert.match(wizard, /06 \/ REVIEW/);
  assert.match(wizard, /Review your evidence boundary/);
  assert.match(wizard, /Your workspace is private/);
  assert.match(page, />Review questions<\/Link>/);
  assert.doesNotMatch(page, /Review questions →/);

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
  assert.match(css, /\.auth-brand__trace span,[\s\S]*\.auth-brand__trace small[\s\S]*font-size:\s*12px/);
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /radial-gradient|linear-gradient|filter:\s*blur|box-shadow:\s*0 0 [^;]*rgba/i);
});

test("approved canonical Foremention artwork stays present while legacy vector artwork stays absent", () => {
  const brand = read("components/brand.tsx");
  const approvedAssets = [
    "public/brand/foremention-logo-white.svg",
    "public/brand/foremention-mark-white.svg",
  ];
  const retiredAssets = [
    "public/brand/foremention-logo.svg",
    "public/brand/foremention-mark.svg",
    "public/source-eclipse.svg",
    "app/favicon.ico",
  ];

  for (const asset of approvedAssets) {
    assert.equal(fs.existsSync(path.join(process.cwd(), asset)), true, `${asset} must remain present`);
  }
  for (const asset of retiredAssets) {
    assert.equal(fs.existsSync(path.join(process.cwd(), asset)), false, `${asset} must remain retired`);
  }

  assert.match(brand, /ForementionMark/);
  assert.match(brand, /wordmark__art/);
  assert.match(brand, /foremention-logo-white\.svg/);
  assert.match(brand, /foremention-mark-white\.svg/);
  assert.match(brand, /<img/);
  assert.doesNotMatch(brand, /wordmark--text-only|wordmark__text|source-eclipse\.svg/);
});
