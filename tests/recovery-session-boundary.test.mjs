import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("password recovery keeps a short-lived purpose boundary from callback through reset", async () => {
  const [cookies, callback, session, verify, page, password] = await Promise.all([
    text("lib/session-cookies.ts"),
    text("components/auth-callback.tsx"),
    text("app/api/auth/session/route.ts"),
    text("app/api/auth/verify/route.ts"),
    text("app/reset-password/page.tsx"),
    text("app/api/auth/password/route.ts"),
  ]);

  assert.match(cookies, /RECOVERY_COOKIE = "foremention-recovery"/);
  assert.match(cookies, /markRecoverySession/);
  assert.match(cookies, /maxAge: 60 \* 15/);
  assert.match(cookies, /clearRecoverySession/);
  assert.match(cookies, /response\.cookies\.delete\(RECOVERY_COOKIE\)/);

  assert.match(callback, /recovery: isRecovery/);
  assert.match(session, /if \(recovery\) markRecoverySession\(response\)/);
  assert.match(session, /else clearRecoverySession\(response\)/);
  assert.match(verify, /if \(type === "recovery"\) markRecoverySession\(response\)/);
  assert.match(verify, /else clearRecoverySession\(response\)/);

  assert.match(page, /store\.get\(RECOVERY_COOKIE\)\?\.value === "1"/);
  assert.match(page, /if \(!recovery\) redirect\("\/forgot-password"\)/);
  assert.match(page, /\/api\/auth\/refresh\?next=/);

  assert.match(password, /recovery !== "1"/);
  assert.match(password, /clearRecoverySession\(result\)/);
});
