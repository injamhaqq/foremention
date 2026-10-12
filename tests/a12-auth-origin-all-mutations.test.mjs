import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { isTrustedMutationOrigin } from "../lib/request-security.ts";

// A12: every browser auth mutation (login, logout, logout-all, signup, session,
// verify, password, forgot-password, sso, demo entry/exit, and any future
// route added under app/api/auth) must reject an untrusted origin before it
// touches a cookie, a token, or the identity provider.
const root = new URL("../", import.meta.url);
const authDir = new URL("app/api/auth/", root);
const guard = 'if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });';
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];
// GET handlers that are top-level navigations, documented here so a new GET
// mutation cannot appear silently. google: redirect to the provider only.
// refresh: rotates the caller's own refresh-token cookie (no login CSRF:
// it can only re-issue the session already held by that browser).
const REVIEWED_GET_ROUTES = new Set(["google/route.ts", "refresh/route.ts", "sso/route.ts"]);

async function routeFiles(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...await routeFiles(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`));
    else if (entry.name === "route.ts") out.push(`${prefix}${entry.name}`);
  }
  return out.sort();
}

test("every mutating auth handler checks the trusted origin as its first statement", async () => {
  const files = await routeFiles(authDir);
  for (const required of ["login/route.ts", "logout/route.ts", "logout-all/route.ts", "signup/route.ts", "forgot-password/route.ts", "password/route.ts", "verify/route.ts", "session/route.ts", "sso/route.ts", "demo/route.ts", "demo/exit/route.ts"]) {
    assert.ok(files.includes(required), `missing auth route ${required}`);
  }
  let checked = 0;
  for (const file of files) {
    const content = await readFile(new URL(file, authDir), "utf8");
    for (const method of MUTATING) {
      const match = content.match(new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(\\s*request[^)]*\\)\\s*(?::[^{]+)?\\{`));
      const exported = new RegExp(`export\\s+(?:const|async function|function)\\s+${method}\\b`).test(content);
      if (!exported) continue;
      assert.ok(match, `${file} ${method} must take the request so it can check origin`);
      const body = content.slice(match.index + match[0].length);
      assert.ok(body.trimStart().startsWith(guard), `${file} ${method} must reject untrusted origins first`);
      checked += 1;
    }
    if (/export\s+(?:async\s+)?function\s+GET\b/.test(content) && !REVIEWED_GET_ROUTES.has(file)) {
      assert.doesNotMatch(content, /cookies\.(?:set|delete)|setSessionCookies|clearSessionCookies/, `${file} GET must not mutate session state`);
    }
  }
  assert.ok(checked >= 11, `expected at least 11 guarded auth mutations, saw ${checked}`);
});

test("canonical origin guard: untrusted rejected, configured and same-origin accepted", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://foremention.com";
  try {
    const url = "https://foremention.com/api/auth/login";
    const req = (headers) => new Request(url, { method: "POST", headers });
    assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com" })), true);
    assert.equal(isTrustedMutationOrigin(req({ origin: "https://evil.example" })), false);
    assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com.evil.example" })), false);
    assert.equal(isTrustedMutationOrigin(req({ origin: "null" })), false);
    assert.equal(isTrustedMutationOrigin(req({})), false);
    // Referer is only a fallback when the browser itself says same-origin.
    assert.equal(isTrustedMutationOrigin(req({ referer: "https://foremention.com/login" })), false);
    assert.equal(isTrustedMutationOrigin(req({ referer: "https://foremention.com/login", "sec-fetch-site": "same-origin" })), true);
    assert.equal(isTrustedMutationOrigin(req({ referer: "https://evil.example/", "sec-fetch-site": "same-origin" })), false);
    assert.equal(isTrustedMutationOrigin(req({ origin: "https://evil.example", "x-forwarded-host": "evil.example" })), false);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
});
