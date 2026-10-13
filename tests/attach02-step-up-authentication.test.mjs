// Chat02 (CV-08 / CV-15 deletion): step-up authentication must be based on the
// interactive sign-in time (amr[].timestamp), never on a refreshed token's iat.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasRecentInteractiveAuthentication, hasRecentStepUpAuthentication, isRecentAccessToken } from "../lib/account-security.ts";
import { syntheticJwt } from "./attach02-harness.mjs";

const now = Math.floor(Date.now() / 1000);
const token = ({ iat = now - 30, exp = now + 3000, role = "authenticated", amr = [{ method: "password", timestamp: now - 30 }] } = {}) => syntheticJwt({ sub: "u", iat, exp, role, amr });

test("Chat02 step-up: recent interactive methods pass", () => {
  for (const method of ["password", "otp", "oauth", "totp", "sso/saml", "magiclink"]) {
    assert.equal(hasRecentInteractiveAuthentication(token({ amr: [{ method, timestamp: now - 60 }] })), true, method);
  }
  assert.equal(hasRecentStepUpAuthentication(token()), true);
});

test("Chat02 step-up: a silently refreshed token with an old sign-in fails although iat is fresh", () => {
  const refreshed = token({ iat: now - 5, amr: [{ method: "password", timestamp: now - 8 * 3600 }, { method: "token_refresh", timestamp: now - 5 }] });
  assert.equal(isRecentAccessToken(refreshed), true, "the legacy iat-only check is fooled by refresh");
  assert.equal(hasRecentInteractiveAuthentication(refreshed), false);
  assert.equal(hasRecentStepUpAuthentication(refreshed), false);
});

test("Chat02 step-up: non-interactive, expired, malformed and non-user tokens fail closed", () => {
  for (const method of ["recovery", "invite", "email/signup", "email_change", "token_refresh", "anonymous"]) {
    assert.equal(hasRecentInteractiveAuthentication(token({ amr: [{ method, timestamp: now - 10 }] })), false, method);
  }
  assert.equal(hasRecentInteractiveAuthentication(token({ exp: now - 1 })), false, "expired");
  assert.equal(hasRecentInteractiveAuthentication(token({ role: "service_role" })), false, "service role");
  assert.equal(hasRecentInteractiveAuthentication(token({ amr: [{ method: "password", timestamp: now + 3600 }] })), false, "future auth time");
  assert.equal(hasRecentInteractiveAuthentication(token({ amr: [{ method: "password", timestamp: String(now) }] })), false, "string timestamp");
  assert.equal(hasRecentInteractiveAuthentication(token({ amr: "password" })), false);
  assert.equal(hasRecentInteractiveAuthentication("not-a-jwt"), false);
  assert.equal(hasRecentInteractiveAuthentication(undefined), false);
});

test("Chat02 step-up: account deletion request, execution and cancellation all require step-up", async () => {
  const route = await readFile(new URL("../app/api/account/deletion/route.ts", import.meta.url), "utf8");
  assert.equal((route.match(/hasRecentStepUpAuthentication\(viewer\.accessToken\)/g) || []).length, 3);
});
