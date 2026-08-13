import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("transient authentication failures preserve refresh sessions and return retryable states", async () => {
  const [supabase, refresh, login, signup, loginPage] = await Promise.all([
    text("lib/supabase-rest.ts"),
    text("app/api/auth/refresh/route.ts"),
    text("app/api/auth/login/route.ts"),
    text("app/api/auth/signup/route.ts"),
    text("app/login/page.tsx"),
  ]);

  assert.match(supabase, /export class SupabaseAuthError extends Error/);
  assert.match(supabase, /this\.status === 429 \|\| this\.status >= 500/);
  assert.match(supabase, /The authentication service is temporarily unavailable/);

  assert.match(refresh, /error instanceof SupabaseAuthError && error\.retryable/);
  assert.match(refresh, /auth_temporarily_unavailable/);
  assert.match(refresh, /Preserve the cookies/);
  assert.match(refresh, /clearSessionCookies\(response\)/);

  const retryableBranch = refresh.indexOf("error instanceof SupabaseAuthError && error.retryable");
  const clearCookies = refresh.indexOf("clearSessionCookies(response)");
  assert.ok(retryableBranch >= 0 && clearCookies > retryableBranch, "retryable auth failures must be handled before destructive cookie clearing");

  assert.match(login, /SupabaseAuthError/);
  assert.match(login, /status: error\.status === 429 \? 429 : 503/);
  assert.match(signup, /SupabaseAuthError/);
  assert.match(signup, /No account changes were confirmed/);
  assert.match(loginPage, /auth_temporarily_unavailable/);
  assert.match(loginPage, /saved session was preserved/i);
});

test("customer intelligence hides raw provider economics while retaining evidence coverage", async () => {
  const intelligence = await text("components/intelligence-loop.tsx");

  assert.doesNotMatch(intelligence, /Recorded run cost/);
  assert.doesNotMatch(intelligence, /Recorded cost/);
  assert.doesNotMatch(intelligence, /Check confidence \+ cost/);
  assert.match(intelligence, /Check confidence \+ coverage/);
  assert.match(intelligence, /Collection coverage/);
  assert.match(intelligence, /change\.kind !== "cost"/);
  assert.match(intelligence, /check\.label !== "Cost trace"/);
  assert.match(intelligence, /New returned sources/);
});
