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
  assert.match(signup, /Design-partner \/ private-beta workspace/i);
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