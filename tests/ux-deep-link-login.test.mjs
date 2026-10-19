// Fix track "ux" (2026-10-19), item 4: deep links survive sign-in.
// Before: the protected /app layout called requireViewer() with its static
// default, so every signed-out visit to any /app URL became /login?next=/app.
// Now the Worker forwards the real request path (always overwriting any client
// value) and requireViewer() turns it into a same-origin, relative /app `next`.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { REQUEST_PATH_HEADER, requestPathHeaderValue, returnPathFromRequestPath } from "../lib/auth-return-path.ts";
import { safeAuthNext } from "../lib/google-auth.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const SITE = "https://foremention.com";

test("the originally requested in-app URL becomes the post-login destination", () => {
  const cases = [
    ["/app", "/app"],
    ["/app/runs/66666666-6666-4666-8666-666666666666", "/app/runs/66666666-6666-4666-8666-666666666666"],
    ["/app/runs/abc?first_evidence=1", "/app/runs/abc?first_evidence=1"],
    ["/app/sources/44444444-4444-4444-8444-444444444444", "/app/sources/44444444-4444-4444-8444-444444444444"],
    ["/app/settings?billing_portal=owner_only", "/app/settings?billing_portal=owner_only"],
    // Client-side navigations request the RSC payload; return to the page itself.
    ["/app/runs.rsc?_rsc=abc123", "/app/runs"],
    ["/app/opportunities/?_rsc=x&tab=open", "/app/opportunities?tab=open"],
  ];
  for (const [requested, expected] of cases) assert.equal(returnPathFromRequestPath(requested), expected, requested);
});

test("open-redirect protection: only same-origin relative /app paths are returned", () => {
  const hostile = [
    "//evil.example", "///evil.example", "https://evil.example/app", "http:/evil.example",
    "/\\evil.example", "/app\\..\\evil", "/\t/evil.example", "/app/\r\n//evil.example",
    "/.//evil.example", "/app/..//evil.example", "/%2e//evil.example", "javascript:alert(1)",
    "/login", "/api/billing/portal", "/apple", "/app/../pricing", "/" + "a".repeat(400),
    `/app/${"x".repeat(400)}`, "", null, undefined,
  ];
  for (const value of hostile) {
    const result = returnPathFromRequestPath(value);
    assert.ok(result === "/app" || result.startsWith("/app/") || result.startsWith("/app?"), `${JSON.stringify(value)} -> ${result}`);
    assert.equal(new URL(result, SITE).origin, SITE, `${JSON.stringify(value)} stays same-origin`);
    assert.ok(!result.startsWith("//"));
    assert.equal(safeAuthNext(result), result, "output is accepted unchanged by every auth return sink");
  }
  assert.equal(returnPathFromRequestPath("https://evil.example/app/runs"), "/app");
  assert.equal(returnPathFromRequestPath("/login?next=/app"), "/app");
});

test("callers' static return paths remain the fallback when no request path is known", () => {
  assert.equal(returnPathFromRequestPath(null, "/app/settings"), "/app/settings");
  assert.equal(returnPathFromRequestPath("/api/billing/portal", "/app/settings"), "/app/settings");
  assert.equal(returnPathFromRequestPath("//evil.example", "/app/runs"), "/app/runs");
  assert.equal(returnPathFromRequestPath(null, "https://evil.example"), "/app", "a bad fallback never escapes either");
});

test("the worker always overwrites the request-path header from the real URL", async () => {
  assert.equal(REQUEST_PATH_HEADER, "x-foremention-request-path");
  assert.equal(requestPathHeaderValue(new URL(`${SITE}/app/runs/x?y=1`)), "/app/runs/x?y=1");
  const worker = await text("worker/index.ts");
  assert.match(worker, /headers\.set\(REQUEST_PATH_HEADER, requestPathHeaderValue\(url\)\);/);
  assert.ok(worker.indexOf("headers.set(REQUEST_PATH_HEADER") < worker.indexOf("const correlatedRequest = new Request(request, { headers })"),
    "set on the forwarded request before the app handler runs");
});

test("requireViewer sends signed-out visitors to login (or refresh) with the requested path", async () => {
  const auth = await text("lib/auth.ts");
  assert.match(auth, /\(await headers\(\)\)\.get\(REQUEST_PATH_HEADER\)/);
  assert.match(auth, /returnPathFromRequestPath\(requested, returnTo\)/);
  assert.match(auth, /const returnTo = await requestedReturnPath\(fallbackReturnTo\);/);
  assert.match(auth, /redirect\(`\/api\/auth\/refresh\?next=\$\{encodeURIComponent\(returnTo\)\}`\)/);
  assert.match(auth, /redirect\(`\/login\?next=\$\{encodeURIComponent\(returnTo\)\}`\)/);
  // The login form and every auth return sink already re-validate `next`.
  const [form, refresh] = await Promise.all([text("components/auth-form.tsx"), text("app/api/auth/refresh/route.ts")]);
  assert.match(form, /const safeNext = safeAuthNext\(next\)/);
  assert.match(refresh, /safeAuthNext\(new URL\(request\.url\)\.searchParams\.get\("next"\)\)/);
});
