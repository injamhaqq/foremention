import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { hasRecentRecoveryAmrClaim } from "../lib/account-security.ts";

const now = 1_800_000_000;
const token = (amr, exp = now + 3600, role = "authenticated") => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ amr, exp, role })}.`;
};

test("Chat02 recovery: only a recent recovery AMR method qualifies", () => {
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: now - 60 }]), now), true);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "password", timestamp: now - 60 }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "token_refresh", timestamp: now - 60 }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: now - 901 }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: now + 60 }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: now }], now - 1), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: now }], now + 60, "service_role"), now), false);
});

test("Chat02 recovery: missing and malformed metadata fail closed", () => {
  assert.equal(hasRecentRecoveryAmrClaim("not-jwt", now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token(null), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery" }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([{ method: "recovery", timestamp: "1800000000" }]), now), false);
  assert.equal(hasRecentRecoveryAmrClaim(token([null, 3]), now), false);
});

test("Chat02 recovery: session adoption, token_hash verification and password mutation gate on recovery proof", async () => {
  const root = new URL("../", import.meta.url);
  const [session, verify, password] = await Promise.all([
    readFile(new URL("app/api/auth/session/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/verify/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/password/route.ts", root), "utf8"),
  ]);
  assert.match(session, /if \(recovery && !hasRecentRecoveryAmrClaim\(access_token\)\)/);
  assert.match(verify, /if \(type === "recovery" && !hasRecentRecoveryAmrClaim\(data\.access_token\)\)/);
  assert.match(password, /recovery !== "1" \|\| !hasRecentRecoveryAmrClaim\(decodeURIComponent\(token\)\)/);
  assert.match(session, /if \(!profile\.ok\)/);
  assert.match(password, /method: "PUT"/);
});
