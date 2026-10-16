import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lib = readFileSync(new URL("../lib/auth-email-delivery.ts", import.meta.url), "utf8");
const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../app/api/auth/forgot-password/route.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");

test("auth links come from GoTrue admin generate_link with the service role, never SMTP", () => {
  assert.match(lib, /\/auth\/v1\/admin\/generate_link/);
  assert.match(lib, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(lib, /parsed\.pathname === "\/auth\/v1\/verify"/);
  assert.match(lib, /parsed\.host === base\.host/);
});

test("signup keeps the attestation hook and neutralizes existing-account responses", () => {
  assert.match(signup, /issueSignupSecurityAttestation/);
  assert.match(signup, /data: signupPayload\.data/);
  assert.match(signup, /error\.alreadyRegistered/);
  assert.match(signup, /signupRequestReceipt\(\)/);
  assert.doesNotMatch(signup, /An account already exists with this email/);
  assert.match(signup, /sendSignupConfirmationEmail/);
});

test("recovery never reveals whether an account exists", () => {
  assert.match(recovery, /error\.userMissing\) return NextResponse\.json\(\{ message: genericMessage \}\)/);
  assert.match(recovery, /sendRecoveryEmail/);
});

test("mail-triggering auth routes are rate limited at the Worker", () => {
  assert.match(worker, /pathname === "\/api\/auth\/signup"\) return \{ endpoint: "auth-signup"/);
  assert.match(worker, /pathname === "\/api\/auth\/forgot-password"\) return \{ endpoint: "auth-recovery"/);
});
