import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedMutationOrigin } from "../lib/request-security.ts";

const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "https://foremention.com";
const req = (headers = {}, url = "https://foremention.com/api/auth/login") => new Request(url, { method: "POST", headers });

test("Chat02: valid production origin, proxy runtime URL and same-origin Referer fallback remain accepted", () => {
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com" })), true);
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com", "sec-fetch-site": "same-origin" })), true);
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com" }, "https://foremention-mvp.workers.dev/api/auth/login")), true);
  assert.equal(isTrustedMutationOrigin(req({ referer: "https://foremention.com/login", "sec-fetch-site": "same-origin" })), true);
});

test("Chat02: explicit cross-site fetch metadata is denied even when Origin claims canonical host", () => {
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com", "sec-fetch-site": "cross-site" })), false);
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://foremention.com", "sec-fetch-site": "cross-site", "x-forwarded-host": "foremention.com" })), false);
});

test("Chat02: reject invalid browser Origin syntax rather than stripping the unsafe parts", () => {
  for (const origin of [
    "https://foremention.com/path",
    "https://foremention.com/?x=y",
    "https://foremention.com#fragment",
    "https://user@foremention.com",
    "file:///",
    "null",
    "https://foremention.com.evil.example",
    "https://foremention.com,https://evil.example",
  ]) assert.equal(isTrustedMutationOrigin(req({ origin })), false, origin);
});

test("Chat02: invalid explicitly supplied Origin cannot downgrade into Referer fallback", () => {
  assert.equal(isTrustedMutationOrigin(req({ origin: "https://evil.example", referer: "https://foremention.com/app", "sec-fetch-site": "same-origin" })), false);
  assert.equal(isTrustedMutationOrigin(req({ origin: "null", referer: "https://foremention.com/app", "sec-fetch-site": "same-origin" })), false);
  assert.equal(isTrustedMutationOrigin(req({ referer: "https://foremention.com/app" })), false);
});

test("Chat02: Host / X-Forwarded-Host headers cannot authorize a different browser origin", () => {
  assert.equal(isTrustedMutationOrigin(req({
    origin: "https://evil.example",
    host: "foremention.com",
    "x-forwarded-host": "foremention.com",
    "x-forwarded-proto": "https",
  })), false);
});

test.after(() => {
  if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
});
