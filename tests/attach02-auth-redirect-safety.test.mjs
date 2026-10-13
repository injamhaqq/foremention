// Chat02 (CV-08 / A12): behavioral open-redirect regressions for every
// auth return-path sink. These import the real helper (no source regexes) and
// resolve its output exactly as the routes and browser components do:
//   - app/api/auth/refresh + google: new URL(next, request.url)
//   - components/auth-callback + auth-form: window.location.replace/assign(next)
//   - app/api/auth/sso: absolute URL handed to the identity provider
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const helperPath = process.env.CHAT02_GOOGLE_AUTH_HELPER || "../lib/google-auth.ts";
const { safeAuthNext, safeAbsoluteAuthNext } = await import(helperPath);

const SITE = "https://foremention.com";
const REQUEST_URL = `${SITE}/api/auth/refresh?next=x`;

// Each of these was, or could plausibly become, a cross-origin navigation.
const HOSTILE = [
  "/.//evil.example",
  "/a/..//evil.example",
  "/%2e//evil.example",
  "/./%2e//evil.example/path?q=1",
  "/\\evil.example",
  "/\\/evil.example",
  "/\t/evil.example",
  "/\n/evil.example",
  "/\r\n//evil.example",
  "//evil.example",
  "///evil.example",
  "https://evil.example/app",
  "javascript:alert(1)",
  "/app\u0000//evil.example",
  "",
  null,
  undefined,
];

test("Chat02 redirect: hostile next values resolve only to the trusted origin", () => {
  for (const value of HOSTILE) {
    const next = safeAuthNext(value);
    assert.equal(new URL(next, REQUEST_URL).origin, SITE, `server redirect escaped for ${JSON.stringify(value)} -> ${next}`);
    // window.location.assign/replace resolves against the current document URL.
    assert.equal(new URL(next, `${SITE}/auth/callback#access_token=t`).origin, SITE, `client redirect escaped for ${JSON.stringify(value)}`);
    assert.ok(next.startsWith("/") && !next.startsWith("//"), `scheme-relative result for ${JSON.stringify(value)}: ${next}`);
  }
});

test("Chat02 redirect: dot-segment scheme-relative bypass is specifically closed", () => {
  assert.equal(safeAuthNext("/.//evil.example"), "/app");
  assert.equal(safeAuthNext("/a/..//evil.example"), "/app");
});

test("Chat02 redirect: legitimate in-app return paths are preserved", () => {
  assert.equal(safeAuthNext("/app"), "/app");
  assert.equal(safeAuthNext("/app/runs/123?first_evidence=1#answer"), "/app/runs/123?first_evidence=1#answer");
  assert.equal(safeAuthNext("/reset-password"), "/reset-password");
  assert.equal(safeAuthNext("/app/settings?integration=google-sheets"), "/app/settings?integration=google-sheets");
  assert.equal(safeAuthNext("/app/../pricing"), "/pricing");
});

test("Chat02 redirect: overlong values are refused instead of truncated into a new target", () => {
  assert.equal(safeAuthNext(`/app/${"a".repeat(400)}`), "/app");
  assert.equal(safeAuthNext(`/app/${"a".repeat(200)}`), `/app/${"a".repeat(200)}`);
});

test("Chat02 redirect: enterprise SSO absolute return URL never leaves the site", () => {
  for (const value of HOSTILE) {
    assert.equal(new URL(safeAbsoluteAuthNext(value, SITE)).origin, SITE, `SSO escaped for ${JSON.stringify(value)}`);
  }
  assert.equal(safeAbsoluteAuthNext("/\\evil.example", SITE), `${SITE}/app`);
  assert.equal(safeAbsoluteAuthNext("/app/settings", `${SITE}/ignored/path`), `${SITE}/app/settings`);
});

test("Chat02 redirect: every auth return-path sink uses the canonical validator", async () => {
  const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");
  const sso = await read("app/api/auth/sso/route.ts");
  assert.match(sso, /safeAbsoluteAuthNext\(/);
  assert.doesNotMatch(sso, /startsWith\("\/\/"\)/, "SSO must not keep its own weaker prefix check");
  for (const p of ["app/api/auth/refresh/route.ts", "app/api/auth/google/route.ts", "app/api/auth/signup/route.ts", "components/auth-callback.tsx", "components/auth-form.tsx"]) {
    assert.match(await read(p), /safeAuthNext\(/, `${p} must use safeAuthNext`);
  }
});
